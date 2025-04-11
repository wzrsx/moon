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