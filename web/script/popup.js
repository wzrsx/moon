const popupElement = document.createElement('div');
let currentPopupFeature = null;
const popup = new ol.Overlay({
    element: document.createElement('div'),
    positioning: 'bottom-center',
    offset: [0, -20],
    stopEvent: false
  });
  map.addOverlay(popup);
  // Функция для создания содержимого popup
  function createPopupContent(moduleInfo, moduleType) {
    return `
      <div class="module-popup">
        <div class="module-popup-header" style="background-color: ${getColorByModuleType(moduleType)}">
            ${moduleInfo.module_name}
        </div>
        <div class="module-popup-image">
            <img src="/static/style/photos/modules_compressed/${moduleInfo.module_type}.png" 
                alt="${moduleInfo.module_name}" 
                style="max-width: 200px; max-height: 150px;">
        </div>
        <div class="module-popup-content">
            <div class="popup-section">
            <strong>Краткое описание:</strong><br> 
            ${moduleInfo.description}
            </div>
            <div class="popup-section">
            <strong>Габариты: (Д×В×Ш)</strong><br>
            ${moduleInfo.length_meters} м × ${moduleInfo.height_meters} м × ${moduleInfo.width_meters} м
            </div>
            <div class="popup-section">
            <div class="expandable-section">
                <div class="expandable-header">
                <strong>Безопасные расстояния от других модулей:</strong>
                </div>
                <div class="expand-hint">
                    Развернуть 
                <span class="expand-icon">▼</span>
                </div>
                <div class="expandable-content">
                ${getModuleDistanceTemplate(moduleInfo)}
                </div>
            </div>
            </div>
            <div class="popup-section">
            <div class="expandable-section">
                <div class="expandable-header">
                <strong>Рекомендации по расположению:</strong>
                </div>
                <div class="expand-hint">
                    Развернуть 
                <span class="expand-icon">▼</span>
                </div>
                <div class="expandable-content">
                ${getModuleDistanceTemplate(moduleInfo, true)}
                </div>
            </div>
        </div> 
    </div>
    `;
  }
  // Добавляем обработчик клика по карте
    map.on('click', function(evt) {
        const feature = map.forEachFeatureAtPixel(evt.pixel, function(feature) {
            return feature;
        });
        
        const popupElement = popup.getElement();
        if (popupElement.contains(evt.originalEvent.target)) {
            return; // Если клик внутри popup - ничего не делаем
        }
        // Если клик вне модуля - закрываем popup
        if (!feature) {
            popupElement.style.display = 'none';
            currentPopupFeature = null;
            return;
        }
        
        // Если клик по модулю - показываем/обновляем popup
        if (feature && feature.get('type')) {
            currentPopupFeature = feature;
            showPopupForFeature(feature);
        }
    });
  // Добавляем обработчик движения курсора
  map.on('pointermove', function(evt) {
    const feature = map.forEachFeatureAtPixel(evt.pixel, function(feature) {
        return feature;
    });
    
    const popupElement = popup.getElement();
    const mapTarget = map.getTargetElement();
    
    // Всегда устанавливаем pointer при наведении на модуль
    if (feature && feature.get('type')) {
        mapTarget.style.cursor = 'pointer';
        
        // Если нет текущего открытого popup - показываем popup
        if (!currentPopupFeature) {
            showPopupForFeature(feature);
        }
    } 
    else {
        // Возвращаем стандартный курсор если не над модулем
        mapTarget.style.cursor = '';
        
        // Скрываем popup если он не зафиксирован и курсор не над ним
        if (!currentPopupFeature && popupElement.style.display === 'block' && 
            !popupElement.contains(evt.originalEvent.target)) {
            popupElement.style.display = 'none';
        }
    }
    
    // Если курсор над открытым popup - оставляем стандартный курсор
    if (currentPopupFeature && popupElement.contains(evt.originalEvent.target)) {
        mapTarget.style.cursor = '';
    }
});

// Функция для отображения popup для конкретного feature
function showPopupForFeature(feature) {
    const popupElement = popup.getElement();
    const moduleInfo = cachedInfoModules.find(module => module.module_type === feature.get('type'));
    const moduleDistances = cachedRadiusModules.find(module => module.module_type === feature.get('type'));
    const coordinates = feature.getGeometry().getCoordinates();
    
    popupElement.innerHTML = createPopupContent(moduleInfo, feature.get('habitation'), moduleDistances);
    popup.setPosition(coordinates);
    popupElement.style.display = 'block';
    
    setTimeout(() => {
        popupElement.querySelectorAll('.expand-hint').forEach(hint => {
            hint.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const section = this.closest('.expandable-section');
                section.classList.toggle('expanded');
                this.textContent = section.classList.contains('expanded') ? 'Свернуть ▲' : 'Развернуть ▼';
            });
        });
    }, 0);
}
  function getModuleDistanceTemplate(module, useMaxDistance = false) {
    const modulePairs = [
      { text: 'административного модуля', key: 'administrative_module' },
      { text: 'астрономической площадки', key: 'astro_site_module' },
      { text: 'вышки связи', key: 'communication_tower_module' },
      { text: 'мусорного полигона', key: 'landfill_module' },
      { text: 'жилого модуля', key: 'living_module' },
      { text: 'медицинского модуля', key: 'medical_module' },
      { text: 'шахты', key: 'mine_module' },
      { text: 'плантации', key: 'plantation_module' },
      { text: 'производственного предприятия', key: 'production_module' },
      { text: 'ремонтного модуля', key: 'repair_module' },
      { text: 'исследовательского модуля', key: 'research_module' },
      { text: 'солнечной электростанции', key: 'solar_power_module' },
      { text: 'космодрома', key: 'spaceport_module' },
      { text: 'спортивного модуля', key: 'sport_module' }
    ];
  
    const result = modulePairs
      .map(pair => {
        const distance = findModulePair(pair.key, module.module_type);
        if (!distance || distance.min_distance === undefined) return null;
  
        if (useMaxDistance) {
          if (distance.max_distance === undefined || distance.max_distance === null) return null;
          const hasBoth = distance.min_distance !== undefined && distance.max_distance !== undefined;
          return `От ${pair.text}: до ${distance.max_distance} метров${hasBoth ? ' (предпочтительная зона)' : ''}`;
        } else {
          const hasMax = distance.max_distance !== undefined && distance.max_distance !== null;
          return `До ${pair.text}: ${hasMax ? 'от' : 'не менее'} ${distance.min_distance} метров`;
        }
      })
      .filter(Boolean)
      .join('<br>');
  
    return [result];
  }
