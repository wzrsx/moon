// модули
let modulesDataByMap;
// Загрузка модулей с сервера
fetch("http://localhost:5050/maps/page/take_modules")
.then(response => {
  if (!response.ok) {
    return response.json().then(data => Promise.reject(data));
  }
  return response.json();
})
.then(modules => {
  // Создаем слой для каждого модуля
  modules.forEach((module, index) => {
    const [lon, lat] = module.points;
    
    // Генерируем путь к изображению для каждого модуля
    const iconPath = `/static/style/photos/${module.module_name}.png`; 
    // Или используем поле из данных, если есть: module.icon_path
    
    const vectorLayer = new ol.layer.Vector({
      source: new ol.source.Vector({
        features: [
          new ol.Feature({
            geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat])),
            name: module.Module_name,
            id: module.IdModule,
            icon: iconPath // Сохраняем путь к иконке в свойствах
          })
        ]
      }),
      style: function(feature, resolution) {
        return createModuleStyle(
          map.getView().getZoom(),
          feature.get('icon') // Получаем путь к иконке из свойств
        );
      }
    });
    
    map.addLayer(vectorLayer);
  });

  // Обновляем стили при изменении масштаба
  map.getView().on('change:resolution', function() {
    map.getLayers().forEach(layer => {
      if (layer instanceof ol.layer.Vector) {
        layer.changed();
      }
    });
  });
})
.catch(error => {
  console.error('Ошибка загрузки модулей:', error);
});

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
const modulesContainer = document.getElementById('modulesContainer');
const modulesList = document.getElementById("modulesList");
const modules = modulesList.querySelectorAll('.item-module');
const typeModulesTitle = document.getElementById("typeModulesTitle");
const notificationsContainer = document.getElementById("notificationsContainer");
//уведы всплывающие
const notification = document.getElementById("customNotification");
let currentModuleType = null;
//обработчики
placeModulesBtn.addEventListener('click', (e) => {
  e.preventDefault();
  modulesChoiceType.style.display = 'grid';
  modulesContainer.style.display = 'none'; // Добавляем скрытие контейнера модулей
  notificationsContainer.style.display = 'none'; // Скрываем уведомления
  typeModulesTitle.innerText = "Выбор модулей";
  if(currentModuleType){
    showModules();
  }
  sidebar.classList.add('visible');
});

notificationsBtn.addEventListener('click', (e) => {
  e.preventDefault();
  modulesChoiceType.style.display = 'none';
  modulesContainer.style.display = 'none'; // Добавляем скрытие контейнера модулей
  typeModulesTitle.innerText = "Уведомления";
  notificationsContainer.style.display = 'block';
  sidebar.classList.add('visible');
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
function closeconfirmDialog(){
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
function closeAside(){
  sidebar.classList.remove('visible');
}
function sendNotification(text, success){
  if(!success){
    notification.style.backgroundColor = "#ff0000";
  }else{
    notification.style.backgroundColor = "#4CAF50";
  }
  notification.innerText=`${text}`;
  notification.classList.add('show');
  setTimeout(() => {
    notification.classList.remove('show');
  }, 1250);
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
      modulesContainer.style.display = 'block';
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
      modulesContainer.style.display = 'none';
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
  module.addEventListener('mousedown', function(e) {
    sidebar.classList.remove('visible');
    greenLayer.setOpacity(1);
    // Закрываем выпадающее меню
    document.getElementById('burger-checkbox').checked = false;
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
    clone.style.objectFit = 'cover'; // Сохраняем пропорции
    
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
    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      greenLayer.setOpacity(0);
      //сделать fetch
      if (clone) {
        clone.remove();
        clone = null;
        draggedItem = null;
      }
    }
    
    document.addEventListener('mouseup', onMouseUp);
  });
  
  // Отмена стандартного drag'n'drop
  module.ondragstart = function() {
    return false;
  };
});

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
      zoom: 1,
      extent: [-216400, -216400, 216400, 216400]
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

  // 4. Добавляем слои на карту
  map.addLayer(ldem);
  map.addLayer(ldsm);
  map.addLayer(hillshade);
  map.addLayer(greenLayer);
  
  // Для базового слоя (яркость)
ldem.on(['precompose', 'postcompose'], function(event) {
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
hillshade.on(['precompose', 'postcompose'], function(event) {
  const context = event.context;
  
  if (event.type === 'precompose') {
    context.save();
    context.globalCompositeOperation = 'multiply';
  } else {
    context.restore();
  }
});

// Для ldsm (screen)
ldsm.on(['precompose', 'postcompose'], function(event) {
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
  map.on('click', function(evt) {
    const rawCoords = evt.coordinate;
    console.log('Координаты в проекции карты:', rawCoords);
  });
