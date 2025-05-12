// модули
// Глобальная переменная для хранения слоев модулей
let moduleLayers = [];
let cachedModules = [];//данные о модулях на карте
let cachedRadiusModules = [];//данные о расстояниях между модулями
let cachedInfoModules = []; //инфа о всех модулях

let dangerSource = new ol.source.Vector(); // Красные зоны (запретные)
let safeSource = new ol.source.Vector();   // Зеленые зоны (разрешенные)
//Глобальные переменные для хранения зон
let currentDangerZone = null;
let currentSafeZone = null;

let onlyGreenInZone = false;

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
      console.log(cachedModules);
      clearModuleLayers();
      const vectorSource = new ol.source.Vector();
      const vectorLayer = new ol.layer.Vector({
        source: vectorSource,
        style: function (feature, resolution) {
          const currentZoom = map.getView().getZoom(); // <-- Получаем текущий зум карты
          return createModuleStyleFunction(currentZoom)(feature, resolution);
        },
        zIndex: 5
      });
      vectorLayer.set('name', 'modules_layer');
      modules.forEach(module => {
        // Координаты уже в метрах (EPSG:100000)
        const [x, y] = module.points;

        // Проверяем, что координаты в пределах видимой области
        if (Math.abs(x) <= 216400 && Math.abs(y) <= 216400) {
          const feature = new ol.Feature({
            geometry: new ol.geom.Point([x, y]),
            type: module.module_type,
            habitation: module.habitation_type,
            id: module.id_module
          });
          vectorSource.addFeature(feature);
        } else {
          console.warn(`Модуль ${module.module_type} вне зоны видимости`, [x, y]);
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
function createModuleStyleFunction(zoom) {
  console.log("zoom in createModuleStyleFunction", zoom);
  return function (feature, resolution) {
    const habitationType = feature.get('habitation');
    const moduleType = feature.get('type');
    const styles = [];
    // Путь к иконке модуля
    const iconPath = `/static/style/photos/modules_compressed/${moduleType}.png`; 

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
          fill: new ol.style.Fill({ color: getColorByModuleType(habitationType) }),
        }),
        new ol.style.Style({
          geometry: new ol.geom.Polygon([squareCoords]),
          fill: new ol.style.Fill({ color: getColorByModuleType(habitationType) }),
        }),
        new ol.style.Style({
          text: new ol.style.Text({
            text: moduleType,
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
          text: moduleType,
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
            color: getColorByModuleType(habitationType)
          }),
          stroke: new ol.style.Stroke({
            color: '#fff',
            width: 1
          })
        }),
        text: new ol.style.Text({
          text: moduleType,
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
      style: function (feature, resolution) {
        const currentZoom = map.getView().getZoom(); // <-- Получаем текущий зум карты
        return createModuleStyleFunction(currentZoom)(feature, resolution);
      },
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
    type: moduleData.module_type,
    habitation: moduleData.habitation_type,
    id: moduleData.id_module
  });

  // Добавляем точку в векторный источник
  vectorSource.addFeature(feature);

  sendNotification(`Модуль "${moduleData.module_type}" добавлен`, true);
}

// Вызываем загрузку модулей при инициализации
loadModules();
getDistances();
getRequirements();

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
const showZonesBtn = document.getElementById("showZonesBtn");
const backMainButtons = document.getElementById("backMainButtons");
const notificationsBtn = document.getElementById("notificationsBtn");
const saveProjectBtn = document.getElementById("saveProjectBtn");
const blurDiv = document.getElementById("blurDiv");
const exitToMainBtn = document.getElementById("exitToMainBtn");
const confirmBtn = document.getElementById("confirmBtn");
//диалоги
const confirmDialog = document.getElementById("confirmDialog");
const saveDialog = document.getElementById("saveDialog");
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
showZonesBtn.addEventListener('click', (e) => {
  e.preventDefault();
  const mainButtons = document.querySelector('.main-buttons');
  const zonesCheckboxes = document.querySelector('.zones-checkboxes');
  mainButtons.style.display = 'none';
  zonesCheckboxes.style.display = 'block';
});
backMainButtons.addEventListener('click', (e) => {
  e.preventDefault();
  const mainButtons = document.querySelector('.main-buttons');
  const zonesCheckboxes = document.querySelector('.zones-checkboxes');
  mainButtons.style.display = 'flex';
  zonesCheckboxes.style.display = 'none';
  // Сбрасываем чекбоксы
  document.querySelectorAll('input[type="checkbox"][data-layer]').forEach(checkbox => {
    checkbox.checked = false;
    updateOptionStyle(checkbox);
  });
  // Сбрасываем радиокнопки
  document.querySelectorAll('#checkboxesModulesName input[type="radio"]').forEach(radio => {
    radio.checked = false;
    updateOptionStyle(radio);
  });
  hideAllLayers();
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
  blurDiv.classList.add("blur");
  saveDialog.showModal();
});
function closeSaveDialog() {
  blurDiv.classList.remove("blur");
  document.querySelectorAll('.format-file-btn').forEach(btn => {
    btn.classList.remove('clicked');
  });
  saveDialog.close();
}
saveDialog.addEventListener("close", () => {
  blurDiv.classList.remove("blur");
  document.querySelectorAll('.format-file-btn').forEach(btn => {
    btn.classList.remove('clicked');
});
});
exitToMainBtn.addEventListener('click', (e) => {
  e.preventDefault();
  blurDiv.classList.add("blur");
  confirmDialog.showModal();
});
function closeConfirmDialog() {
  blurDiv.classList.remove("blur");
  confirmDialog.close();
}
confirmBtn.addEventListener('click', (e) => {
  e.preventDefault();
  fetch('http://localhost:5050/maps/exit', {
    method: 'GET',
    credentials: 'include'
  })
  .then(response => {
    if (response.ok) {
      blurDiv.classList.remove("blur");
      window.location.href = "/";
    } else {
      throw new Error('Exit failed');
    }
  })
  .catch(error => {
    console.error('Error:', error);
    sendNotification('Ошибка при выходе', 0);
  });
});
confirmDialog.addEventListener("close", () => {
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
  }, 2000);
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
//диалог сохранить
document.querySelectorAll('.format-file-btn').forEach(button => {
  button.addEventListener('click', function() {
      // Удаляем класс у всех кнопок (если нужно только одна активная)
      document.querySelectorAll('.format-file-btn').forEach(btn => {
          btn.classList.remove('clicked');
      });
      // Добавляем класс к текущей кнопке
      this.classList.add('clicked');
  });
});
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
let isDragging = false; // Флаг перетаскивания
let clone = null;
let startX, startY;
modules.forEach(module => {
  module.addEventListener('mousedown', async function (e) {
    const moduleType =  module.getAttribute('data-name-en-db');

    //Получаем требования к модулю
    try {
      // 1. Получаем требования 
      const moduleRequirements = cachedInfoModules.find(rule => 
        rule.module_type === moduleType
      );
      console.log("Требования модуля:", moduleRequirements);

      // 2. Прячем sidebar и т.д.
      sidebar.classList.remove('visible');
      isOpenAside = false;
      checkboxDropMenu.checked = false;
      sendNotification('Зоны для размещения модуля выделены зеленым цветом.', 1);
      // 3. Показываем радиусы и уклоны (?)
      await toggleExclusionRadius(true, cachedModules, moduleRequirements);

      if (moduleRequirements.module_type === 'medical_module' || moduleRequirements.module_type === 'repair_module') {
        onlyGreenInZone = true;
        await updateClippedLayer();
      }else{
        onlyGreenInZone = false;
        await updateClippedLayer();
      }
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

      // Позиция клона
      const rect = originalImg.getBoundingClientRect();
      clone.style.left = rect.left + 'px';
      clone.style.top = rect.top + 'px';

      document.body.appendChild(clone);

      // Новый расчет смещения 
      const shiftX = rect.width / 2; 
      const shiftY = rect.height / 2;

      function moveAt(pageX, pageY) {
        clone.style.left = pageX - shiftX + 'px';
        clone.style.top = pageY - shiftY + 'px';
      }
      
      function onMouseMove(e) {
        moveAt(e.clientX, e.clientY);
      }
  
      // Перемещаем клон при движении мыши
      document.addEventListener('mousemove', onMouseMove);
      isDragging = true;
    
      // Очистка при отпускании кнопки мыши
      function onMouseUp(e) {
        isDragging = false;
        if (currentClippedLayer && currentClippedLayer !== greenLayer) {
          map.removeLayer(currentClippedLayer);
      }
        toggleExclusionRadius(false);
        //Проверка зоны
        const pixel = [e.clientX, e.clientY];
        const coordinates = map.getCoordinateFromPixel(pixel);
        const typeEn = module.getAttribute('data-name-en-db');
        const moduleData = {
          module_type: typeEn,
          habitation_type: currentModuleType,
          points: coordinates
        };
        //ЕСЛИ Жилой -> 15deg 
        if (currentModuleType === 'inhabited') {
          checkAreaAllOnes("compress_5deg", coordinates[0], coordinates[1], moduleRequirements.width_meters, moduleRequirements.length_meters)
            .then(async result => {
              if (!result) {
                sendNotification("В области есть несоответствие уклона - размещение запрещено!", 0);
                return;
              }
              if (await isInDangerZone(coordinates)) {
                sendNotification("Запрещенная зона!", 0);
                return;
              }
              if (moduleRequirements.module_type === 'medical_module' ) {
                if (!await isInSafeZone(coordinates)) { // аналогично
                  sendNotification(`${moduleRequirements.module_name} должен располагаться в зеленой зоне`, 0);
                  return;
                }
              }
              saveModule(moduleData);
            })
            .catch(error => {
              console.error('Ошибка при проверке зон:', error);
              sendNotification("Произошла ошибка при проверке местоположения.", 0);
            });
        }
        //ЕСЛИ Производство -> 5deg
        else if(currentModuleType === 'technological'){
          checkAreaAllOnes("compress_5deg", coordinates[0], coordinates[1], moduleRequirements.width_meters, moduleRequirements.length_meters)
          .then(async result => {
            if (!result) {
              sendNotification("В области есть несоответствие уклона - размещение запрещено!", 0);
              return;
            }
            if (await isInDangerZone(coordinates)) {
              sendNotification("Запрещенная зона!", 0);
              return;
            }
            if (moduleRequirements.module_type === 'repair_module' ) {
              if (!await isInSafeZone(coordinates)) { // аналогично
                sendNotification(`${moduleRequirements.module_name} должен располагаться в зеленой зоне`, 0);
                return;
              }
            }
            saveModule(moduleData);
          })
          .catch(error => {
            console.error('Ошибка при проверке зон:', error);
            sendNotification("Произошла ошибка при проверке местоположения.", 0);
          });
        }
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
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
  module.addEventListener('dragstart', (e) => {
    e.preventDefault();
    return false;
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
        module_type: moduleData.module_type,
        habitation_type: moduleData.habitation_type,
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
  'UNIT["m",1],'  +
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
const ldem = createFullscreenLayer('LDEM_83S_10MPP_ADJ', 1.0, 1);
const ldsm = createFullscreenLayer('LDSM_83S_10MPP_ADJ', 0.3, 2);
const hillshade = createFullscreenLayer('LDEM_83S_10MPP_ADJ_HILL', 0.6, 3);
const greenLayer = createFullscreenLayer('compress_5deg', 0, 4);
greenLayer.set('name', 'greenLayer');
// Создаем WMS-слой с возможностью обновления фильтра

map.on('moveend', async function() {
  if (isDragging) {
    await updateClippedLayer();
  }
});
/*зоны предпочтительных мест*/
const malapertCenter = [29980, 148640];
const malapertRadius = 72385 / 2;
const malapertCircle = new ol.geom.Circle(malapertCenter, malapertRadius);
const malapertFeature = new ol.Feature({ geometry: malapertCircle });
const malapertLayer = new ol.layer.Vector({
  source: new ol.source.Vector({ features: [malapertFeature] }),
  style: new ol.style.Style({
    fill: new ol.style.Fill({ color: [158, 42, 255, 0.2] }),
    stroke: new ol.style.Stroke({ color: [158, 42, 255, 1], width: 2 })
  }),
  opacity: 0,
  zIndex: 7
});
malapertLayer.set('name', 'malapertLayer');

const shackletonCenter = [7450, -6120];
const shackletonRadius = 10462.5;
const shackletonCircle = new ol.geom.Circle(shackletonCenter, shackletonRadius);
const shackletonFeature = new ol.Feature({ geometry: shackletonCircle });
const shackletonLayer = new ol.layer.Vector({
  source: new ol.source.Vector({ features: [shackletonFeature] }),
  style: new ol.style.Style({
    fill: new ol.style.Fill({ color: [0, 100, 255, 0.2] }),
    stroke: new ol.style.Stroke({ color: [0, 50, 255, 1], width: 2 })
  }),
  opacity: 0,
  zIndex: 7
});
shackletonLayer.set('name', 'shackletonLayer');

const haworthCenter = [-6950, 76850];
const haworthRadius = 25711.5;
const haworthCircle = new ol.geom.Circle(haworthCenter, haworthRadius);
const haworthFeature = new ol.Feature({ geometry: haworthCircle });
const haworthLayer = new ol.layer.Vector({
  source: new ol.source.Vector({ features: [haworthFeature] }),
  style: new ol.style.Style({
    fill: new ol.style.Fill({ color: [50, 205, 50, 0.2] }),
    stroke: new ol.style.Stroke({ color: [0, 100, 0, 1], width: 2 })
  }),
  opacity: 0,
  zIndex: 7
});
haworthLayer.set('name', 'haworthLayer');

map.addLayer(ldem);
map.addLayer(ldsm);
map.addLayer(hillshade);
map.addLayer(greenLayer);
map.addLayer(malapertLayer);
map.addLayer(shackletonLayer);
map.addLayer(haworthLayer);

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

function updateScaleBar() {
  const resolution = map.getView().getResolution();
  const units = map.getView().getProjection().getUnits();
  const dpi = 96;
  const inchesPerMeter = 39.37;
  
  // Рассчитываем масштаб
  let scale = resolution * dpi * inchesPerMeter;
  let scaleText, barWidth;
  
  // Определяем подходящие единицы (метры или километры)
  if (scale >= 1000) {
    scale = scale / 1000;
    scaleText = Math.round(scale) + ' km';
    barWidth = 100; // Фиксированная ширина линейки в пикселях
  } else {
    scaleText = Math.round(scale) + ' m';
    barWidth = 100 * (scale / 1000); // Пропорционально уменьшаем для метров
  }
  
  // Обновляем отображение
  const container = document.getElementById('scaleDisplayContainer');
  container.innerHTML = `
    <div class="scale-line">
      <div class="scale-bar" style="width: ${barWidth}px;"></div>
      <div class="scale-text">${scaleText}</div>
    </div>
  `;
}
map.getView().on('change:resolution', updateScaleBar);
function showPlacesZone(zoneName) {
  let centerCoords;
  let targetZoom = 10;

  switch(zoneName.toLowerCase()) {
    case 'malapert':
      malapertLayer.setOpacity(1);
      centerCoords = [malapertCenter[0], malapertCenter[1] - 3000]; //чтобы сверху карта полностью помещалась
      break;
    case 'shackleton':
      shackletonLayer.setOpacity(1);
      centerCoords = shackletonCenter;
      targetZoom = 12;
      break;
    case 'haworth':
      haworthLayer.setOpacity(1);
      centerCoords = haworthCenter;
      targetZoom = 11;
      break;
    default:
      console.warn(`Unknown zone name: ${zoneName}`);
      return; // Выходим, если зона неизвестна
  }

  map.getView().animate({
    center: centerCoords,
    zoom: targetZoom,
    duration: 1000 // Длительность анимации в миллисекундах
  });
}
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
  const popupElement = popup.getElement();
  if (isOpenAside || (popupElement && popupElement.style.display === 'block' && popupElement.contains(evt.originalEvent.target))) {
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

async function toggleExclusionRadius(show, modules, moduleToAdd) {
  // Очищаем предыдущие слои
  exclusionRadiusLayers.forEach(layer => map.removeLayer(layer));
  exclusionRadiusLayers.length = 0;
  dangerSource.clear();
  safeSource.clear();
  if (!show || !modules || !moduleToAdd) return;

  // Создаем стили для слоев
  const dangerLayer = new ol.layer.Vector({
    source: dangerSource,
    style: new ol.style.Style({
      fill: new ol.style.Fill({ color: 'rgba(255, 0, 0, 0.5)' }),
      stroke: new ol.style.Stroke({ color: 'rgba(255, 0, 0, 0.8)', width: 2 })
    }),
    zIndex: 6
  });

  const safeLayer = new ol.layer.Vector({
    source: safeSource,
    style: new ol.style.Style({
      fill: new ol.style.Fill({ color: 'rgba(0, 56, 43, 0.2)' }),
      stroke: new ol.style.Stroke({ color: 'rgba(1, 50, 32, 0.8)', width: 2 })
    }),
    zIndex: 5
  });

  try {
    const dangerPolygons = [];
    const safePolygons = [];

    for (const module of modules) {
      if (!module.points || !Array.isArray(module.points)) {
        console.error("Invalid module coordinates:", module);
        continue;
      }

      const pair = findModulePair(module.module_type, moduleToAdd.module_type);
      // Создаем опасные зоны (min_distance)
      if (pair.min_distance > 0) {
        const polygon = fromCircle(module.points, pair.min_distance); // Используем нашу функцию преобразования
        dangerPolygons.push(polygon);
      }

      // Создаем безопасные зоны (max_distance)
      if (pair.max_distance > 0) {
        const polygon = fromCircle(module.points, pair.max_distance);
        safePolygons.push(polygon);
      }
    }
    // Объединяем пересекающиеся полигоны
    const mergedDanger = mergePolygons(dangerPolygons);
    const mergedSafe = mergePolygons(safePolygons);
    let finalSafe;
    // Затем добавляем опасные зоны, 
    if (mergedSafe) {
      if (mergedDanger) {
        // Вычитаем из безопасной зоны пересекающуюся с опасной
        try {
          finalSafe = turf.difference(mergedSafe, mergedDanger);
        } catch (e) {
          console.warn('Ошибка вычитания зон:', e);
          finalSafe = mergedSafe; // fallback
        }
      } else {
        finalSafe = mergedSafe;
      }
    }

    // Добавляем в слои
    if (mergedDanger) {
      const dangerFeature = new ol.format.GeoJSON().readFeature(mergedDanger);
      dangerSource.addFeature(dangerFeature);
    }

    if (finalSafe) {
      const safeFeature = new ol.format.GeoJSON().readFeature(finalSafe);
      safeSource.addFeature(safeFeature);
    }

    // Добавляем слои на карту
    map.addLayer(dangerLayer);
    map.addLayer(safeLayer);
    exclusionRadiusLayers.push(dangerLayer, safeLayer);
    currentDangerZone = mergedDanger;
    currentSafeZone = finalSafe;
  } catch (error) {
    console.error('Error building zones:', error);
    dangerSource.clear();
    safeSource.clear();
  }
} 
function disableExclusionZones() {
  // Удаляем слои с карты
  exclusionRadiusLayers.forEach(layer => {
    if (map.getLayers().getArray().includes(layer)) {
      map.removeLayer(layer);
    }
  });
  
  // Очищаем массив слоев
  exclusionRadiusLayers.length = 0;
  
  // Очищаем источники данных
  dangerSource.clear();
  safeSource.clear();
  
  // Сбрасываем текущие зоны
  currentDangerZone = null;
  currentSafeZone = null;
}
function mergePolygons(polygons) {
  if (polygons.length === 0) return null;
  
  let merged = polygons[0];
  for (let i = 1; i < polygons.length; i++) {
    try {
      merged = turf.union(merged, polygons[i]);
    } catch (e) {
      console.warn('Ошибка объединения полигонов:', e);
    }
  }
  return merged;
}
// Функция для преобразования Circle в Polygon
function fromCircle(center, radius, points = 32) {
  const coordinates = [];
      for (let i = 0; i <= points; i++) {
        const angle = (i * 2 * Math.PI) / points;
        const x = center[0] + radius * Math.cos(angle);
        const y = center[1] + radius * Math.sin(angle);
        coordinates.push([x, y]);
      }
      coordinates.push(coordinates[0]); // Замыкаем полигон
      return turf.polygon([coordinates]);
}
function findModulePair(type1, type2) {
  //type1 на карте существующий модуль
  //type2 добавляем
  const moduleRules = cachedRadiusModules.filter(rule => 
    rule.module_type1 === type1 || 
    rule.module_type2 === type1
  );//тут ищем 14 требований
  
  // Затем ищем нужную пару расстояний
  return moduleRules.find(item => 
    (item.module_type1 === type1 && item.module_type2 === type2) ||
    (item.module_type1 === type2 && item.module_type2 === type1)
  );
}

// Вспомогательные функции:
async function isInDangerZone(point) {
  if (!currentDangerZone) {
    console.warn("Зоны ещё не построены");
    return false;
  }
  const pointTurf = turf.point(point);
  return turf.booleanPointInPolygon(pointTurf, currentDangerZone);
}
async function isInSafeZone(point) {
  if (!currentSafeZone) {
    console.warn("Зоны ещё не построены");
    return false;
  }
  const pointTurf = turf.point(point);
  return turf.booleanPointInPolygon(pointTurf, currentSafeZone);
}

function getRequirements() {
  return fetch("http://localhost:5050/maps/redactor/page/take_modules_requirements", {
    method: 'GET'
  })
    .then((response) => {
      return response.json().then(data => {
        if (!response.ok) {
          console.error(data.error);
          if (data.error) {
            sendNotification(data.error, false);
          }
          return Promise.reject(data);
        }
        cachedInfoModules = Object.values(data.requirements_json);
        populateModuleCheckboxes();
        return data; // Возвращаем успешно полученные данные
      });
    })
    .then(data => {
      return data.requirements_json; 
    })
    .catch(error => {
      console.error('Ошибка получения требований модуля:', error);
      throw error; // Пробрасываем ошибку дальше
    });
}
function getDistances() {  
  return fetch("http://localhost:5050/maps/redactor/page/take_modules_distance", {
    method: 'GET'
  })
    .then((response) => {
      return response.json().then(data => {
        if (!response.ok) {
          console.error(data.error);
          if (data.error) {
            sendNotification(data.error, false);
          }
          return Promise.reject(data);
        }
        cachedRadiusModules = Object.values(data.requirements_json);
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

function getBoundingBox(multiPolygonGeometry) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  multiPolygonGeometry.coordinates.forEach(polygon => {
    polygon.forEach(ring => {
      ring.forEach(coord => {
        const [x, y] = coord;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      });
    });
  });

  return [minX, minY, maxX, maxY]; // Возвращаем массив, а не объект
}

function getGreenLayerBbox(bbox, typeModule, width, height) {
  console.log(bbox);
  const imgUrl = `http://localhost:8080/geoserver/wms?` +
    `service=WMS&version=1.1.0&request=GetMap&` +
    `layers=moon_workspace:${typeModule}&` +
    `bbox=${bbox.join(',')}&` + 
    `width=${width}&height=${height}&` +
    `srs=EPSG:100000&` +
    `format=image/png&` +
    `transparent=true`;

  console.log('WMS Request (GeoTIFF-aligned):', imgUrl);
  return loadImage(imgUrl);
}

async function getClippedImage(greenZone, redZone, typeModule, meterPerPixel = 10) {
  const mapSize = map.getSize();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.floor(mapSize[0] * dpr);
  const height = Math.floor(mapSize[1] * dpr);

  const view = map.getView();
  const bbox = view.calculateExtent(map.getSize());
  const [minX, minY, maxX, maxY] = bbox;
  const image = await getGreenLayerBbox(bbox, typeModule, width, height);
  console.log("image", image.src);
  console.log("bbox", bbox);

  // 2. Создаем canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  
  // 3. Рисуем исходное изображение
  ctx.drawImage(image, 0, 0, mapSize[0], mapSize[1]);

  // 4. Функция проекции координат
  function projectToCanvas(x, y) {
    return [
      ((x - minX) / (maxX - minX)) * mapSize[0],
      mapSize[1] - ((y - minY) / (maxY - minY)) * mapSize[1]
    ];
  }

  // 5. Сохраняем состояние
  ctx.save();
  if (!greenZone && redZone) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'black';
    ctx.beginPath();
    processCoordinates(redZone, ctx, projectToCanvas);
    ctx.fill();
  }
  else if (!greenZone) {
    // Если нет зеленой зоны (и возможно нет красной) - просто оставляем изображение как есть
    // Ничего не делаем, уже нарисовали исходное изображение
  }
  else if (onlyGreenInZone) {
    // Режим только зеленые зоны - делаем прозрачным все вне зеленых зон
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = 'black';
    ctx.beginPath();
    processCoordinates(greenZone, ctx, projectToCanvas);
    ctx.fill();

    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'black';
    ctx.beginPath();
    processCoordinates(redZone, ctx, projectToCanvas);
    ctx.fill();
  } else {
    // Стандартный режим - затемняем зеленые зоны и вырезаем красные
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(0, 100, 0, 0.5)';
    ctx.beginPath();
    processCoordinates(greenZone, ctx, projectToCanvas);
    ctx.fill();
    
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'black';
    ctx.beginPath();
    processCoordinates(redZone, ctx, projectToCanvas);
    ctx.fill();
  }

  // Восстанавливаем состояние
  ctx.restore();

  // Возвращаем слой
  const clippedLayer = new ol.layer.Image({
    source: new ol.source.ImageStatic({
      url: canvas.toDataURL('image/png'),
      imageExtent: bbox,
      projection: 'EPSG:100000'
    }),
    opacity: 0.7,
    zIndex: 4
  });
  clippedLayer.set('isClippedLayer', true);
  return clippedLayer;
}
let currentClippedLayer = null;
function processCoordinates(zone, ctx, projectFn) {
  if (zone.geometry.type === 'MultiPolygon') {
    zone.geometry.coordinates.forEach(polygon => {
      polygon.forEach(ring => {
        ring.forEach((coord, i) => {
          const [x, y] = projectFn(coord[0], coord[1]);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
      });
    });
  } else {
    zone.geometry.coordinates[0].forEach((coord, i) => {
      const [x, y] = projectFn(coord[0], coord[1]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
  }
}
async function updateClippedLayer() {
  // Удаляем старый clippedLayer (если он не greenLayer)
  if (currentClippedLayer && currentClippedLayer !== greenLayer) {
    map.removeLayer(currentClippedLayer);
    currentClippedLayer = null;
  }

  const clippedLayer = await getClippedImage(currentSafeZone, currentDangerZone, 'compress_5deg');
  currentClippedLayer = clippedLayer;
  map.addLayer(clippedLayer);
}

function toggleSlopeOptions(header) {
  const control = header.parentElement;
  control.classList.toggle('expanded');
}

function updateOptionStyle(inputElement) {
  const option = inputElement.closest('.slope-option') || inputElement.closest('.slope-toggle-btn');
  
  // Для radio-кнопок сначала снимаем выделение со всех элементов группы
  if (inputElement.type === 'radio') {
    // Находим все radio-кнопки в той же группе
    const groupName = inputElement.name;
    document.querySelectorAll(`input[name="${groupName}"]`).forEach(radio => {
      radio.closest('.slope-option')?.classList.remove('checked');
    });
  }
  
  // Устанавливаем класс checked в зависимости от состояния элемента
  if (inputElement.checked) {
    option.classList.add('checked');
  } else {
    option.classList.remove('checked');
  }
}
// Функция для создания чекбоксов типов модулей 
function populateModuleCheckboxes() {
  const optionsContainer = document.getElementById('checkboxesModulesName');
  const groupRadioName = 'moduleSelection';
  // Очищаем контейнер перед заполнением
  optionsContainer.innerHTML = '';
  
  // Создаем чекбоксы для каждого наименования модуля
  cachedInfoModules.forEach(module => {
    const optionDiv = document.createElement('div');
    optionDiv.className = 'slope-option radio';
    
    const radioId = `${module.module_type}Radio`;
    
    optionDiv.innerHTML = `
      <input type="radio" id="${radioId}" name="moduleSelection" value="${module.module_type}" onchange="updateOptionStyle(this)">
      <label for="${radioId}">${module.module_name}</label>
    `;
    
    optionsContainer.appendChild(optionDiv);
  });
}
async function hideAllLayers() {
  isDragging = false;
  await toggleExclusionRadius(false);
  const layers = map.getLayers().getArray();
  layers.forEach(layer => {
    if (layer.get("name") ) { // Проверяем, есть ли у слоя имя
      layer.setOpacity(0); // Скрываем слой
    }
    else if(layer.get('isClippedLayer')){
      map.removeLayer(layer); 
    }
  });
}