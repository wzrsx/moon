const popupElement = document.createElement('div');
let currentPopupFeature = null;
let currentModuleInfo = null;
const popup = new ol.Overlay({
    element: document.createElement('div'),
    positioning: 'bottom-center',
    offset: [0, -20],
    stopEvent: false
  });
map.addOverlay(popup);
document.addEventListener('DOMContentLoaded', function() {
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', confirmModuleDeletion);
    }
});
function showPopupForFeature(feature) {
    const popupElement = popup.getElement();
    const moduleType = feature.get('type');
    const moduleInfo = cachedInfoModules.find(module => module.module_type === moduleType);
    const coordinates = feature.getGeometry().getCoordinates();
    currentModuleInfo = moduleInfo;
    currentPopupFeature = feature;

    popupElement.innerHTML = createPopupContent(
        moduleInfo, 
        feature.get('habitation')
    );
    
    popup.setPosition(coordinates);
    popupElement.style.display = 'block';
    
    initPopupEventListeners(popupElement, moduleInfo);
}

function initPopupEventListeners(popupElement, moduleInfo) {
    // Раскрывающиеся секции
    popupElement.querySelectorAll('.expand-hint').forEach(hint => {
        hint.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const section = this.closest('.expandable-section');
            const isExpanded = section.classList.toggle('expanded');
            const icon = this.querySelector('.expand-icon');
            icon.textContent = isExpanded ? '▲' : '▼';
            this.textContent = isExpanded ? 'Свернуть ' : 'Развернуть ';
            this.appendChild(icon);
        });
    });

    // Кнопка удаления
    const deleteBtn = popupElement.querySelector('.delete-module');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showDeleteModuleDialog(moduleInfo.module_name);
        });
    }
}

function createPopupContent(moduleInfo, habitationType) {
    return `
        <div class="module-popup">
            <div class="module-popup-header" style="background-color: ${getColorByModuleType(habitationType)}">
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
                            Развернуть <span class="expand-icon">▼</span>
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
                            Развернуть <span class="expand-icon">▼</span>
                        </div>
                        <div class="expandable-content">
                            ${getModuleDistanceTemplate(moduleInfo)}
                        </div>
                    </div>
                </div>
                <div>
                    <button class="delete-module">
                        <span>Удалить модуль</span>
                    </button>
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

function confirmModuleDeletion() {
    if (!currentModuleInfo || !currentPopupFeature) return;
    moduleLayers[0].getSource().removeFeature(currentPopupFeature);
    
    cachedInfoModules = cachedInfoModules.filter(m => m.module_type !== currentModuleInfo.module_type);
    cachedRadiusModules = cachedRadiusModules.filter(m => m.module_type !== currentModuleInfo.module_type);
    
    const popupElement = popup.getElement();
    popupElement.style.display = 'none';
    
    deleteModuleFromDB(currentPopupFeature.get('id'));
    
    // Сбрасываем текущие данные
    currentModuleInfo = null;
    currentPopupFeature = null;
    
    // Закрываем диалог
    closeDeleteModuleDialog();
}
async function deleteModuleFromDB(id) {
    try {
        const response = await fetch('http://localhost:5050/maps/redactor/page/delete_module', {
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                id_module: id
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete module');
        }

        return await response.json();
    } catch (error) {
        console.error('Delete module error:', error);
        sendNotification(`Ошибка удаления: ${error.message}`, false);
        throw error;
    }
}