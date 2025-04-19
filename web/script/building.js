// модули
// Глобальная переменная для хранения слоев модулей
let moduleLayers = [];
let cachedModules = [];//данные о модулях
const dangerSource = new ol.source.Vector(); // Красные зоны (запретные)
const safeSource = new ol.source.Vector();   // Зеленые зоны (разрешенные)
// Функция загрузки модулей с сервера

function loadModules() {
  fetch("http://localhost:5050/maps/redactor/page/take_modules")
    .then(response => response.json())
    .then(modules => {
       // Гарантированно инициализируем как массив
      cachedModules = Array.isArray(modules) ? modules : [];
      clearModuleLayers();
      if (!modules || modules.length === 0) {
        console.log("Нет модулей для отображения");
        return; // Прекращаем выполнение если модулей нет
      }
      cachedModules = modules;
      clearModuleLayers();
      const vectorSource = new ol.source.Vector();
      const vectorLayer = new ol.layer.Vector({
        source: vectorSource,
        style: createModuleStyleFunction(),
        zIndex: 5
      });

      modules.forEach(module => {
        // Координаты уже в метрах (EPSG:100000)
        const [x, y] = module.points;

        // Проверяем, что координаты в пределах видимой области
        if (Math.abs(x) <= 216400 && Math.abs(y) <= 216400) {
          const feature = new ol.Feature({
            geometry: new ol.geom.Point([x, y]),
            name: module.module_name,
            type: module.module_type,
            id: module.id_module
          });
          vectorSource.addFeature(feature);
        } else {
          console.warn(`Модуль ${module.module_name} вне зоны видимости`, [x, y]);
        }
      });

      map.addLayer(vectorLayer);
      moduleLayers.push(vectorLayer);

      // Центрируем карту на модулях
      if (modules.length > 0) {
        const [firstX, firstY] = modules[0].points;
        map.getView().setCenter([firstX, firstY]);
        map.getView().setZoom(5);
      }
    })
    .catch(console.error);
}
// Функция создания стиля для модулей
function createModuleStyleFunction() {
  return function (feature, resolution) {
    const zoom = map.getView().getZoom();
    const moduleType = feature.get('type');
    const moduleName = feature.get('name');
    const styles = [];
    // Путь к иконке модуля
    const iconPath = `/static/style/photos/${moduleName}.png`; // MODULE NAME _________________>>>>

    const iconScale = 0.1 * Math.pow(0.8, 16 - zoom); // Экспоненциальное уменьшение

    if (zoom >= 17) {
      // Создание стиля для зоны вокруг модуля
      const coordinates = feature.getGeometry().getCoordinates(); // Получаем координаты точки
      const x = coordinates[0];
      const y = coordinates[1];

      // Остальной код
      const size = 6; // Размер квадрата в пикселях
      const halfSize = size / 2;

      // Создание квадратной геометрии
      const squareCoords = [
        [x - halfSize, y - halfSize],
        [x + halfSize, y - halfSize],
        [x + halfSize, y + halfSize],
        [x - halfSize, y + halfSize],
        [x - halfSize, y - halfSize], // замыкание квадрата
      ];

      return [
        new ol.style.Style({
          fill: new ol.style.Fill({ color: getColorByModuleType(moduleType) }),
        }),
        new ol.style.Style({
          geometry: new ol.geom.Polygon([squareCoords]),
          fill: new ol.style.Fill({ color: getColorByModuleType(moduleType) }),
        }),
        new ol.style.Style({
          text: new ol.style.Text({
            text: moduleName,
            offsetY: -20,
            font: 'bold 12px Jura',
            fill: new ol.style.Fill({ color: '#fff' }),
            stroke: new ol.style.Stroke({ color: '#000', width: 2 }),
          }),
        }),
      ];
    } else if (zoom >= 12) {
      return new ol.style.Style({
        image: new ol.style.Icon({
          src: iconPath,
          scale: iconScale,
          anchor: [0.5, 0.5],
          imgSize: [300, 300]
        }),
        text: new ol.style.Text({
          text: moduleName,
          offsetY: 20,
          font: 'bold 12px Jura',
          fill: new ol.style.Fill({ color: '#fff' }),
          stroke: new ol.style.Stroke({ color: '#000', width: 2 })
        })
      });
    } else {
      // Стиль для отдаленного вида (цветная точка)
      return new ol.style.Style({
        image: new ol.style.Circle({
          radius: 5 + (zoom * 0.2),
          fill: new ol.style.Fill({
            color: getColorByModuleType(moduleType)
          }),
          stroke: new ol.style.Stroke({
            color: '#fff',
            width: 1
          })
        }),
        text: new ol.style.Text({
          text: moduleName,
          offsetY: -20,
          font: 'bold 12px Jura',
          fill: new ol.style.Fill({ color: '#fff' }),
          stroke: new ol.style.Stroke({ color: '#000', width: 2 })
        })
      });
    }
  };
}

// Функция очистки слоев модулей
function clearModuleLayers() {
  moduleLayers.forEach(layer => {
    map.removeLayer(layer);
  });
  moduleLayers = [];
}

// Функция добавления нового модуля
function addModuleToMap(moduleData) {
  // Если слоев нет - создаем новый
  if (moduleLayers.length === 0) {
    const vectorSource = new ol.source.Vector();
    const vectorLayer = new ol.layer.Vector({
      source: vectorSource,
      style: createModuleStyleFunction(),
      zIndex: 5
    });
    
    map.addLayer(vectorLayer);
    moduleLayers.push(vectorLayer);
  }
  // Получаем ссылку на векторный слой, который уже добавлен на карту
  const currentVectorLayer = moduleLayers[moduleLayers.length - 1]; // Последний добавленный слой
  const vectorSource = currentVectorLayer.getSource(); // Получаем его source

  // Создаём новую точку
  const feature = new ol.Feature({
    geometry: new ol.geom.Point(moduleData.points),
    name: moduleData.module_name,
    type: moduleData.module_type,
    id: moduleData.id_module // если у вас есть этот ID
  });

  // Добавляем точку в векторный источник
  vectorSource.addFeature(feature);

  sendNotification(`Модуль "${moduleData.module_name}" добавлен`, true);
}

// Вызываем загрузку модулей при инициализации
loadModules();


// Вспомогательная функция для цветов по типу модуля
function getColorByModuleType(type) {
  const colors = {
    'inhabited': '#2196F3', // Синий
    'technological': '#ff4f00' // Оранжевый
  };
  return colors[type] || '#FF5722'; // Оранжевый по умолчанию
}

// кнопки
const placeModulesBtn = document.getElementById("placeModulesBtn");
const notificationsBtn = document.getElementById("notificationsBtn");
const saveProjectBtn = document.getElementById("saveProjectBtn");
const blurDiv = document.getElementById("blurDiv");
const exitToMainBtn = document.getElementById("exitToMainBtn");
const confirmBtn = document.getElementById("confirmBtn");
//диалог
const dialog = document.getElementById("confirmDialog");
//боковая панель
const sidebar = document.getElementById("modulesSidebar");

const modulesChoiceType = document.getElementById("modulesChoiceType");

const modulesContainerInhabited = document.getElementById('modulesContainerInhabited');
const modulesContainerTechnological = document.getElementById('modulesContainerTechnological');

const modulesList = document.getElementById("modulesList");
const modules = document.querySelectorAll('.item-module');
const typeModulesTitle = document.getElementById("typeModulesTitle");
const notificationsContainer = document.getElementById("notificationsContainer");

const checkboxDropMenu = document.getElementById('burger-checkbox');
//уведы всплывающие
const notification = document.getElementById("customNotification");
let currentModuleType = null;
let isOpenAside = null;
//обработчики
placeModulesBtn.addEventListener('click', (e) => {
  e.preventDefault();
  modulesChoiceType.style.display = 'grid';
  modulesContainerInhabited.style.display = 'none'; // Добавляем скрытие контейнера модулей
  modulesContainerTechnological.style.display = 'none'; 
  notificationsContainer.style.display = 'none'; // Скрываем уведомления
  typeModulesTitle.innerText = "Выбор модулей";
  if (currentModuleType) {
    showModules();
  }
  sidebar.classList.add('visible');
  isOpenAside = true;
});

notificationsBtn.addEventListener('click', (e) => {
  e.preventDefault();
  modulesChoiceType.style.display = 'none';
  modulesContainerInhabited.style.display = 'none'; // Добавляем скрытие контейнера модулей
  modulesContainerTechnological.style.display = 'none'; 
  typeModulesTitle.innerText = "Уведомления";
  notificationsContainer.style.display = 'block';
  sidebar.classList.add('visible');
  isOpenAside = true;
});
saveProjectBtn.addEventListener('click', (e) => {
  e.preventDefault();
  /*to do ОТВЕТ ОТ СЕРВЕРА*/
  //sendNotification("Изменения успешно сохранены", 1);
  code = 404;//пример
  sendNotification(`Возникла ошибка: ${code}`, 0);
});
exitToMainBtn.addEventListener('click', (e) => {
  e.preventDefault();
  blurDiv.classList.add("blur");
  dialog.showModal();
});
function closeconfirmDialog() {
  blurDiv.classList.remove("blur");
  dialog.close();
}
confirmBtn.addEventListener('click', (e) => {
  e.preventDefault();
  blurDiv.classList.remove("blur");
  window.location.href = "../index.html"
});
dialog.addEventListener("close", () => {
  blurDiv.classList.remove("blur");
});
/*to do ПРИМЕНИТЬ НА ВСЕ БОКОВЫЕ ПО КЛАССУ*/
document.addEventListener('keydown', event => {
  if (event.key === "Escape" || event.keyCode === 27) {
    closeAside();

  }
});
function closeAside() {
  sidebar.classList.remove('visible');
  isOpenAside = false;
}
function sendNotification(text, success) {
  if (!success) {
    notification.style.backgroundColor = "#ff0000";
  } else {
    notification.style.backgroundColor = "#4CAF50";
  }
  notification.innerText = `${text}`;
  notification.classList.add('show');
  setTimeout(() => {
    notification.classList.remove('show');
  }, 1500);
}
/*можно будет с бд подтянуть модули*/
function openInhabitedModules() {
  // Сохраняем тип выбранных модулей
  currentModuleType = 'inhabited';
  showModules();
}
function openTechnologicalModules() {
  // Сохраняем тип выбранных модулей
  currentModuleType = 'technological';
  showModules();
}
function showModules() {
  typeModulesTitle.innerText = currentModuleType === 'inhabited'
    ? "Обитаемые модули"
    : "Технологические объекты";

  modulesChoiceType.style.opacity = '0';
  modulesChoiceType.style.transform = 'translateY(20px)';
  modulesChoiceType.style.transition = 'all 0.3s ease-out';

  setTimeout(() => {
    modulesChoiceType.style.display = 'none';
    modulesContainerInhabited.style.display = currentModuleType === 'inhabited' ? 'block' : 'none';
    modulesContainerTechnological.style.display = currentModuleType === 'technological' ? 'block' : 'none';
    notificationsContainer.style.display = 'none'; // Скрываем уведомления

    modules.forEach(module => {
      module.style.opacity = '0';
      module.style.transform = 'translateY(20px)';
    });

    setTimeout(() => {
      modules.forEach((module, index) => {
        setTimeout(() => {
          module.style.opacity = '1';
          module.style.transform = 'translateY(0)';
          module.style.transition = 'all 0.3s ease-out';
        }, index * 100);
      });
    }, 50);
  }, 300);
}

function backToTypes() {
  typeModulesTitle.innerText = "Выбор модулей";
  modules.forEach(module => {
    module.style.opacity = '0';
    module.style.transform = 'translateY(20px)';
    module.style.transition = 'all 0.2s ease-out';
  });

  setTimeout(() => {
    modulesContainerInhabited.style.display = currentModuleType === 'inhabited' ? 'none' : 'block';
    modulesContainerTechnological.style.display = currentModuleType === 'technological' ? 'none' : 'block';
    notificationsContainer.style.display = 'none'; // Скрываем уведомления
    modulesChoiceType.style.display = 'grid';

    setTimeout(() => {
      modulesChoiceType.style.opacity = '1';
      modulesChoiceType.style.transform = 'translateY(0)';
      modulesChoiceType.style.transition = 'all 0.3s ease-out 0.1s';
    }, 50);
  }, 200);
  currentModuleType = null;
}

//перетаскивание фотки на карту
let draggedItem = null;
let clone = null;
let startX, startY;
modules.forEach(module => {
  module.addEventListener('mousedown', async function (e) {
     const moduleType = {
      module_type: module.getAttribute('data-name-en-db')
    };

    //Получаем требования к модулю
    try {
      // 1. Получаем требования СНАЧАЛА
      const moduleRequirements = await getRequirements(moduleType);
      console.log("Требования модуля:", moduleRequirements);

      // 2. Прячем sidebar и т.д.
      sidebar.classList.remove('visible');
      isOpenAside = false;
      checkboxDropMenu.checked = false;
      
      // 3. Показываем радиусы и уклоны (?)
      toggleExclusionRadius(true, cachedModules, moduleRequirements);
      greenLayer.setOpacity(0.7)
      // 4. Создаем drag-элемент
      const originalImg = this.querySelector('.photo-item-module');
      clone = originalImg.cloneNode(true);

      clone.style.transform = 'scale(0.3)';
      clone.style.transition = 'transform 0.2s';
  
      // Стили для клона (только изображение)
      clone.style.position = 'absolute';
      clone.style.zIndex = '1000';
      clone.style.pointerEvents = 'none';
      clone.style.width = originalImg.offsetWidth + 'px';
      clone.style.height = originalImg.offsetHeight + 'px';
      clone.style.objectFit = 'contain';

  
      // Запоминаем оригинальный элемент
      draggedItem = this;
  
      // Позиция курсора при зажатии
      startX = e.clientX;
      startY = e.clientY;
  
      // Позиция клона (рассчитываем относительно изображения)
      const rect = originalImg.getBoundingClientRect();
      clone.style.left = rect.left + 'px';
      clone.style.top = rect.top + 'px';
  
      document.body.appendChild(clone);
  
      // Смещаем клон относительно курсора
      const shiftX = e.clientX - rect.left;
      const shiftY = e.clientY - rect.top;
  
      function moveAt(pageX, pageY) {
        clone.style.left = pageX - shiftX + 'px';
        clone.style.top = pageY - shiftY + 'px';
      }
  
      function onMouseMove(e) {
        moveAt(e.clientX, e.clientY);
      }
  
      // Перемещаем клон при движении мыши
      document.addEventListener('mousemove', onMouseMove);
  
      // Очистка при отпускании кнопки мыши
      function onMouseUp(e) {
        //Проверка зоны
        const pixel = [e.clientX, e.clientY];
        const coordinates = map.getCoordinateFromPixel(pixel);
        const nameEn = module.getAttribute('data-name-en-db');
        const moduleData = {
          module_name: nameEn,
          module_type: currentModuleType,
          points: coordinates
        };
        
        //ЕСЛИ Жилой -> 15deg 
        if(currentModuleType === 'inhabited'){
          checkAreaAllOnes("compress_5deg", coordinates[0], coordinates[1], moduleRequirements.width_meters, moduleRequirements.length_meters)
          .then(result => {
            console.log(result);
            if (!result) {
              sendNotification("В области есть несоответсвие уклона - размещение запрещено!", 0);
            }
            else if(isInDangerZone(coordinates)){
              sendNotification("Запрещенная зона!", 0);
            }
            else{
              saveModule(moduleData);
            }
          })
        }
        //ЕСЛИ Производство -> 5deg
        else if(currentModuleType === 'technological'){
          checkAreaAllOnes("compress_5deg", coordinates[0], coordinates[1], moduleRequirements.width_meters, moduleRequirements.length_meters)
          .then(result => {
            console.log(result);
            if (!result) {
              sendNotification("В области есть несоответсвие уклона - размещение запрещено!", 0);
            }
            else if(isInDangerZone(coordinates)){
              sendNotification("Запрещенная зона!", 0);
            }
            else{
              saveModule(moduleData);
            }
          })
        }
        
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        greenLayer.setOpacity(0); 
        toggleExclusionRadius(false);
        if (clone) {
          clone.remove();
          clone = null;
          draggedItem = null;
        }
      }
  
      document.addEventListener('mouseup', onMouseUp);
      module.ondragstart = () => false;
    } catch (error) {
      sendNotification('Ошибка при получении требований модуля', 0);
      console.error(error);
    }
  });
});

function saveModule(moduleData){
  fetch("http://localhost:5050/maps/redactor/page/save_module", {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(moduleData)
  })
    .then((response) => {
      return response.json().then(data => {
        if (!response.ok) {
          console.log(data.error);
          if (data.error) {
            sendNotification(data.error, false);
          }
          return Promise.reject(data);
        }
        return data; // Возвращаем успешно полученные данные
      });
    })
    .then(data => {
      cachedModules.push({
        points: moduleData.points,
        module_name: moduleData.module_name,
        module_type: moduleData.module_type,
      });
      addModuleToMap(moduleData);
    })
    .catch(error => {
      console.error('Ошибка сохранения модуля:', error);
      // Здесь можно также обработать другие ошибки, если нужно
    });
}
// 1. Регистрация проекции
proj4.defs("EPSG:100000",
  'PROJCS["Moon_2015_South_Polar_Stereographic",' +
  'GEOGCS["Moon_2015",' +
  'DATUM["D_Moon_2015",' +
  'SPHEROID["Moon_2015_IAU_IAG",1737400,0]],' +
  'PRIMEM["Reference_Meridian",0],' +
  'UNIT["degree",0.0174532925199433]],' +
  'PROJECTION["Polar_Stereographic"],' +
  'PARAMETER["latitude_of_origin",-90],' +
  'PARAMETER["central_meridian",0],' +
  'PARAMETER["scale_factor",1],' +
  'PARAMETER["false_easting",0],' +
  'PARAMETER["false_northing",0],' +
  'UNIT["metre",1],' +
  'AUTHORITY["EPSG","100000"]]'
);
ol.proj.proj4.register(proj4);

// 2. Настройка полноэкранной карты
const map = new ol.Map({
  target: 'map',
  view: new ol.View({
    projection: 'EPSG:100000',
    center: [0, 0],
    extent: [-216400, -216400, 216400, 216400],
    zoom: 1, // начальный уровень зума
    minZoom: 1, // минимальный уровень зума
    maxZoom: 20 // максимальный уровень зума
  })
});

// 3. Функция создания полноэкранных слоев
const createFullscreenLayer = (layerName, opacity, zIndex) => {
  return new ol.layer.Image({
    source: new ol.source.ImageWMS({
      url: 'http://localhost:8080/geoserver/moon_workspace/wms',
      params: {
        'LAYERS': `moon_workspace:${layerName}`,
        'VERSION': '1.3.0',
        'CRS': 'EPSG:100000',
        'FORMAT': 'image/png',
        'TRANSPARENT': true,
        'WIDTH': Math.floor(window.innerWidth * 1.5),
        'HEIGHT': Math.floor(window.innerHeight * 1.5)
      },
      serverType: 'geoserver',
      ratio: 1,
      hidpi: false
    }),
    opacity: opacity,
    zIndex: zIndex
  });
};

// 4. Создание и добавление слоев
// Слои в правильном порядке:
const ldem = createFullscreenLayer('ldem-83s', 1.0, 1);
const ldsm = createFullscreenLayer('ldsm-83s', 0.3, 2);
const hillshade = createFullscreenLayer('ldem-hill', 0.6, 3);
const greenLayer = createFullscreenLayer('cmps_5deg', 0, 4);

// 4. Добавляем слои на карту
map.addLayer(ldem);
map.addLayer(ldsm);
map.addLayer(hillshade);
map.addLayer(greenLayer);

// Для базового слоя (яркость)
ldem.on(['precompose', 'postcompose'], function (event) {
  const context = event.context;
  const canvas = context.canvas;

  if (event.type === 'precompose') {
    // Сохраняем оригинальное состояние
    context.save();
    context.filter = 'brightness(1.2)';
  } else {
    // Восстанавливаем после отрисовки
    context.restore();
  }
});

// Для hillshade (multiply)
hillshade.on(['precompose', 'postcompose'], function (event) {
  const context = event.context;

  if (event.type === 'precompose') {
    context.save();
    context.globalCompositeOperation = 'multiply';
  } else {
    context.restore();
  }
});

// Для ldsm (screen)
ldsm.on(['precompose', 'postcompose'], function (event) {
  const context = event.context;

  if (event.type === 'precompose') {
    context.save();
    context.globalCompositeOperation = 'screen';
  } else {
    context.restore();
  }
});

// 6. Автоматическая подстройка под размер окна
function updateMapSize() {
  const size = [window.innerWidth, window.innerHeight];
  map.setSize(size);
  map.getView().setZoom(map.getView().getZoom());

  /*layers.forEach(layer => {
    layer.getSource().updateParams({
      'WIDTH': Math.floor(size[0] * 1.5),
      'HEIGHT': Math.floor(size[1] * 1.5)
    });
  });*/
}

window.addEventListener('resize', () => {
  setTimeout(updateMapSize, 100);
});

// Инициализация
updateMapSize();
map.on('click', function (evt) {
  const rawCoords = evt.coordinate;
  console.log('Координаты в проекции карты:', rawCoords);
});

const mousePositionElement = document.createElement('div');
mousePositionElement.id = 'mouse-coordinates';
mousePositionElement.style.position = 'absolute';
mousePositionElement.style.backgroundColor = 'white';
mousePositionElement.style.padding = '5px';
mousePositionElement.style.border = '1px solid #ccc';
mousePositionElement.style.borderRadius = '3px';
mousePositionElement.style.pointerEvents = 'none';
mousePositionElement.style.zIndex = '1000';
mousePositionElement.style.display = 'none';
mousePositionElement.style.fontFamily = 'Jura';
mousePositionElement.style.fontWeight = '700';
document.body.appendChild(mousePositionElement);

//Вывод координат
const dropdownMenu = document.querySelector('.dropdown-menu');
const zoomItems = document.querySelector('.ol-zoom');
const navElement = document.querySelector('nav');

checkboxDropMenu.addEventListener('click', (e) => {
  mousePositionElement.style.display = checkboxDropMenu.checked ? 'none' : 'block';
});
// Обработчик движения курсора по карте
map.on('pointermove', function (evt) {
  if (isOpenAside) {
    mousePositionElement.style.display = 'none';
    return;
  }
  updateMousePosition(evt.coordinate, evt.pixel);
});
//Обработчик движения курсора по всей странице
document.addEventListener('mousemove', function (e) {
  if (dropdownMenu.contains(e.target) || zoomItems.contains(e.target)) {
    mousePositionElement.style.display = 'none';
  }
});
// Обработчик покидания окна
document.addEventListener('mouseout', function (e) {
  if (!e.relatedTarget && !e.toElement) {
    mousePositionElement.style.display = 'none';
  }
});
// Обработчик движения курсора по nav
navElement.addEventListener('mousemove', function (e) {
  if (!isOpenAside) {
    const mapRect = map.getTargetElement().getBoundingClientRect();
    const pixel = [e.clientX - mapRect.left, e.clientY - mapRect.top];
    const coordinate = map.getCoordinateFromPixel(pixel);
    updateMousePosition(coordinate, null, e.clientX, e.clientY);
  }
});

// Выносим debounce и кэш за пределы функции
// Выносим debounce и кэш за пределы функции
let lastElevationController = null; // Используем AbortController вместо request
const elevationCache = new Map(); // Кэш для хранения высот

// Функция для кэширования координат (округление до 2 знаков)
function getCacheKey(coordinate) {
  return `${coordinate[0].toFixed(2)},${coordinate[1].toFixed(2)}`;
}

// Функция запроса высоты (уже с debounce)
const fetchElevationDebounced = debounce((coordinate, viewResolution) => {
  const cacheKey = getCacheKey(coordinate);
  
  // Проверяем кэш
  if (elevationCache.has(cacheKey)) {
    const elevationText = elevationCache.get(cacheKey);
    updateElevationText(coordinate, elevationText);
    return;
  }
  
  const url = ldem.getSource().getFeatureInfoUrl(
    coordinate,
    viewResolution,
    'EPSG:100000',
    {'INFO_FORMAT': 'application/json'}
  );
  
  if (!url) return;

  // Отменяем предыдущий запрос, если он еще выполняется
  if (lastElevationController) {
    lastElevationController.abort();
  }
  
  // Создаем новый контроллер для текущего запроса
  lastElevationController = new AbortController();
  
  fetch(url, { signal: lastElevationController.signal })
    .then(response => {
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    })
    .then(data => {
      let elevationText;
      if (data.features && data.features.length > 0) {
        const elevation = data.features[0].properties.GRAY_INDEX;
        elevationText = `${elevation.toFixed(2)} м`;
      } else {
        elevationText = 'нет данных';
      }
      
      // Сохраняем в кэш
      elevationCache.set(cacheKey, elevationText);
      updateElevationText(coordinate, elevationText);
    })
    .catch(error => {
      if (error.name !== 'AbortError') {
        console.error('Ошибка запроса:', error);
        updateElevationText(coordinate, 'ошибка запроса');
      }
    });
}, 100);

// Функция для обновления текста высоты
function updateElevationText(coordinate, elevationText) {
  mousePositionElement.innerHTML = `
    Проекционные: ${coordinate[0].toFixed(2)} м, ${coordinate[1].toFixed(2)} м <br>
    Высота над уровнем моря: ${elevationText}
  `;
}

// Функция для обновления позиции и содержимого координат
function updateMousePosition(coordinate, pixel, clientX, clientY) {
  // Обновляем позицию элемента
  if (pixel) {
    mousePositionElement.style.left = (pixel[0] + 10) + 'px';
    mousePositionElement.style.top = (pixel[1] + 10) + 'px';
  } else {
    mousePositionElement.style.left = (clientX + 10) + 'px';
    mousePositionElement.style.top = (clientY + 10) + 'px';
  }

  // Показываем элемент с координатами
  mousePositionElement.innerHTML = `
    Проекционные: ${coordinate[0].toFixed(2)} м, ${coordinate[1].toFixed(2)} м <br>
    Высота над уровнем моря: загрузка...
  `;
  mousePositionElement.style.display = 'block';

  // Запрашиваем высоту с debounce и кэшированием
  const viewResolution = map.getView().getResolution();
  fetchElevationDebounced(coordinate, viewResolution);
}

// Функция debounce для ограничения частоты вызовов
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}


async function checkAreaAllOnes(layerName, centerX, centerY, widthMeters, heightMeters) {
  const minX = centerX - widthMeters / 2;
  const minY = centerY - heightMeters / 2;
  const maxX = centerX + widthMeters / 2;
  const maxY = centerY + heightMeters / 2;

  // Рассчитываем размеры в пикселях (10mpp)
  const widthPixels = Math.ceil(widthMeters / 10);  // Округляем вверх
  const heightPixels = Math.ceil(heightMeters / 10);
  console.log(widthPixels, heightPixels);
  // 1. Запрашиваем изображение (1 пиксель = 10 метров)
  const imgUrl = `http://localhost:8080/geoserver/wms?` +
    `service=WMS&version=1.1.0&request=GetMap&` +
    `layers=${layerName}&` +
    `bbox=${minX},${minY},${maxX},${maxY}&` +
    `width=${widthPixels}&height=${heightPixels}&` + // 10mpp
    `srs=EPSG:100000&` +
    `format=image/png&` +
    `transparent=true`;

  // 2. Загружаем изображение в Canvas
  const img = await loadImage(imgUrl);
  const canvas = document.createElement("canvas");
  canvas.width = widthPixels;
  canvas.height = heightPixels;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, widthPixels, heightPixels);

  // 3. Анализируем пиксели
  const imageData = ctx.getImageData(0, 0, widthPixels, heightPixels).data;
  
  for (let i = 3; i < imageData.length; i += 4) { // Проверяем только альфа-канал
    const alpha = imageData[i]; // Альфа-канал (0 = прозрачный, 255 = непрозрачный)
    if (alpha === 0) { // Если пиксель прозрачный
      return false;
    }
  }
  return true;
}



// Вспомогательная функция загрузки изображения
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
  // Функция для добавления/удаления радиуса
const exclusionRadiusLayers = [];

function toggleExclusionRadius(show, modules, moduleToAdd) {
  // Удаляем все существующие слои с радиусами
  exclusionRadiusLayers.forEach(layer => {
    map.removeLayer(layer);
  });
  exclusionRadiusLayers.length = 0;

  if (!show || !modules || !moduleToAdd) return;

  // Получаем требования для добавляемого модуля
  const moduleRequirements = moduleToAdd;


  const dangerLayer = new ol.layer.Vector({
    source: dangerSource,
    style: new ol.style.Style({
      fill: new ol.style.Fill({
        color: 'rgba(255, 0, 0, 0.5)' // Красный с прозрачностью
      }),
      stroke: new ol.style.Stroke({
        color: 'rgba(255, 0, 0, 0.8)',
        width: 2
      })
    }),
    zIndex: 6
  });

  const safeLayer = new ol.layer.Vector({
    source: safeSource,
    style: new ol.style.Style({
      fill: new ol.style.Fill({
        color: 'rgba(0, 56, 43, 0.2)' // Зеленый с прозрачностью
      }),
      stroke: new ol.style.Stroke({
        color: 'rgba(1, 50, 32, 0.8)',
        width: 2
      })
    }),
    zIndex: 5
  });

  // Обрабатываем каждый существующий модуль
  modules.forEach(module => {
    if (!module.points || !Array.isArray(module.points)) {
      console.error("Некорректные координаты модуля:", module);
      return;
    }

    // 1. Красные зоны (запретные) - проверяем все ограничения 
    if (1) {
      const radius = getMinZoneRadius(moduleRequirements);
      console.log(radius);
      if (radius > 0) {
        const feature = new ol.Feature({
          geometry: new ol.geom.Circle(module.points, radius)
        });
        dangerSource.addFeature(feature);
      }
    }

    // 2. Зеленые зоны (разрешенные) - проверяем требования близости 
    if (shouldShowSafeZone(moduleRequirements)) {
      const radius = getSafeZoneRadius(moduleRequirements);
      if (radius > 0) {
        const feature = new ol.Feature({
          geometry: new ol.geom.Circle(module.points, radius)
        });
        safeSource.addFeature(feature);
      }
    }
  });

  // Добавляем слои на карту
  map.addLayer(dangerLayer);
  map.addLayer(safeLayer);
  exclusionRadiusLayers.push(dangerLayer, safeLayer);
}

// Вспомогательные функции:
function isInDangerZone(point) {
  const features = dangerSource.getFeatures();
  for (const feature of features) {
    const geometry = feature.getGeometry();
    if (geometry.intersectsCoordinate(point)) {
      return true;
    }
  }
  return false;
}
function shouldShowMinZone(requirements) {
  // Проверяем, нужно ли показывать красную зону для этого модуля
  return requirements.is_hazardous || 
         requirements.min_distance_from_living ||
         requirements.min_distance_from_production;
}

function getMinZoneRadius(requirements) {
    if(requirements.min_distance_from_living) {
      return requirements.min_distance_from_living;
    }
    else if(requirements.min_distance_from_production){
      return requirements.min_distance_from_production;
    }
}

function shouldShowSafeZone(requirements) {
  return requirements.max_distance_from_living ||
         requirements.max_distance_from_production;
}

function getSafeZoneRadius(requirements) {
  // Определяем радиус зеленой зоны
  if (requirements.max_distance_from_living) return requirements.max_distance_from_living;
  if (requirements.max_distance_from_production) return requirements.max_distance_from_production;
  return 0; // Нет зоны
}

function getRequirements(moduleType) {
  return fetch("http://localhost:5050/maps/redactor/page/take_modules_requirements", {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(moduleType)
  })
    .then((response) => {
      return response.json().then(data => {
        if (!response.ok) {
          console.log(data.error);
          if (data.error) {
            sendNotification(data.error, false);
          }
          return Promise.reject(data);
        }
        return data; // Возвращаем успешно полученные данные
      });
    })
    .then(data => {
      return data.requirements_json; // Возвращаем для цепочки промисов
    })
    .catch(error => {
      console.error('Ошибка получения требований модуля:', error);
      throw error; // Пробрасываем ошибку дальше
    });
}