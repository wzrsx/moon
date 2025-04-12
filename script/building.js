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

//обработчики
placeModulesBtn.addEventListener('click', (e) => {
    e.preventDefault();
    modulesChoiceType.style.display = 'grid';
    typeModulesTitle.innerText = "Выбор модулей";
    sidebar.classList.add('visible');
});
notificationsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    modulesChoiceType.style.display = 'none';
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
  typeModulesTitle.innerText = "Обитаемые модули";
  modulesChoiceType.style.opacity = '0';
  modulesChoiceType.style.transform = 'translateY(20px)';
  modulesChoiceType.style.transition = 'all 0.3s ease-out';
  
  setTimeout(() => {
      modulesChoiceType.style.display = 'none';
      modulesContainer.style.display = 'block';
      
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
function openTechnologicalModules() {
  typeModulesTitle.innerText = "Технологические объекты";
  modulesChoiceType.style.opacity = '0';
  modulesChoiceType.style.transform = 'translateY(20px)';
  modulesChoiceType.style.transition = 'all 0.3s ease-out';
  
  setTimeout(() => {
      modulesChoiceType.style.display = 'none';
      modulesContainer.style.display = 'block';
      
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
      modulesChoiceType.style.display = 'grid';
      
      setTimeout(() => {
          modulesChoiceType.style.opacity = '1';
          modulesChoiceType.style.transform = 'translateY(0)';
          modulesChoiceType.style.transition = 'all 0.3s ease-out 0.1s';
      }, 50);
  }, 200);
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

  // 4. Добавляем слои на карту
  map.addLayer(ldem);
  map.addLayer(ldsm);
  map.addLayer(hillshade);

  // 5. Применяем blend modes через postcompose
  hillshade.on('postrender', function(event) {
    event.context.globalCompositeOperation = 'multiply';
  });

  ldsm.on('postrender', function(event) {
    event.context.globalCompositeOperation = 'screen';
  });

  // 6. Яркость для базового слоя
  ldem.on('postrender', function(event) {
    event.context.filter = 'brightness(1.2)';
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