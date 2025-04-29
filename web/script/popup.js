const popup = new ol.Overlay({
    element: document.createElement('div'),
    positioning: 'bottom-center',
    offset: [0, -20],
    stopEvent: false
  });
  map.addOverlay(popup);
  // Функция для создания содержимого popup
  function createPopupContent(moduleName, moduleType, moduleDescription) {
    return `
      <div class="module-popup">
        <div class="module-popup-header" style="background-color: ${getColorByModuleType(moduleType)}">
          ${moduleName}
        </div>
        <div class="module-popup-image">
          <img src="/static/style/photos/modules_compressed/${moduleName}.png" 
               alt="${moduleName}" 
               style="max-width: 200px; max-height: 150px;">
        </div>
        <div>
            ${moduleDescription} <br>
            Габариты:
            Безопасные расстояния от других модулей:
            Рекомендуемое расположение:x
        </div> 
      </div>
    `;
  }
  
  // Добавляем обработчик движения курсора
  map.on('pointermove', function(evt) {
    const feature = map.forEachFeatureAtPixel(evt.pixel, function(feature) {
      return feature;
    });
    
    const popupElement = popup.getElement();
    
    if (feature && feature.get('name')) {
      const moduleName = feature.get('name');
      const moduleType = feature.get('type');
      const coordinates = feature.getGeometry().getCoordinates();
      
      popupElement.innerHTML = createPopupContent(moduleName, moduleType, moduleDescription);
      popup.setPosition(coordinates);
      popupElement.style.display = 'block';
    } else {
      popupElement.style.display = 'none';
    }
  });
  
  // Добавляем CSS для popup (можно добавить в ваш CSS файл)
  const style = document.createElement('style');
  style.textContent = `
    .module-popup {
      background: white;
      border-radius: 5px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      overflow: hidden;
    }
    .module-popup-header {
      color: white;
      padding: 5px 10px;
      font-weight: bold;
      text-align: center;
      font-family: 'Jura', sans-serif;
    }
    .module-popup-image {
      padding: 10px;
      text-align: center;
    }
    .ol-popup {
      position: absolute;
      background-color: white;
      box-shadow: 0 1px 4px rgba(0,0,0,0.2);
      padding: 0;
      border-radius: 5px;
      border: 1px solid #cccccc;
      bottom: 12px;
      left: -50px;
      min-width: 220px;
    }
  `;
  document.head.appendChild(style);