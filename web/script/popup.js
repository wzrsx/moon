const popupElement = document.createElement('div');
let currentPopupFeature = null;
let currentModuleInfo = null;
let visibilityModulesInfo = bboxVisibilityModulesInfo.checked;
let isDraggingMove = false; // Флаг перемещения
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
map.on('pointerdrag', function() {
    isDraggingMove = true;
});
map.on('pointerup', function() {
    if (isDraggingMove && currentPopupFeature) {
        adjustPopupPosition();
    }
    isDraggingMove = false;
});
bboxVisibilityModulesInfo.addEventListener('change', function() {
        visibilityModulesInfo = this.checked;
        console.log('Module info visibility changed to:', visibilityModulesInfo); // Для отладки

        // Здесь можно добавить логику показа/скрытия информации
        if (!visibilityModulesInfo) {
            const popupElement = popup.getElement();
            popupElement.style.display = 'none';
        }
    
    });

// Функция для корректировки позиции popup
function adjustPopupPosition() {
    if (!currentPopupFeature || !visibilityModulesInfo) return;
    
    const popupElement = popup.getElement();
    const feature = currentPopupFeature;
    const coordinates = feature.getGeometry().getCoordinates();
    const pixel = map.getPixelFromCoordinate(coordinates);
    
    // Получаем размеры карты и popup
    const mapSize = map.getSize();
    const popupRect = popupElement.getBoundingClientRect();
    const mapRect = map.getTargetElement().getBoundingClientRect();
    
    // Проверяем, выходит ли popup за верхнюю границу
    const topEdge = pixel[1] - popupRect.height - 20; // 20 - offset
    
    // Если popup выходит за верхнюю границу, показываем его снизу
    if (topEdge < 0) {
        popup.setPositioning('top-center');
        popup.setOffset([0, 20]);
    } 
    // Иначе возвращаем стандартное позиционирование
    else {
        popup.setPositioning('bottom-center');
        popup.setOffset([0, -20]);
    }
    
    // Обновляем позицию popup
    popup.setPosition(coordinates);
}

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
    
    // Первоначально устанавливаем стандартное позиционирование
    popup.setPositioning('bottom-center');
    popup.setOffset([0, -20]);
    
    // Корректируем позицию
    adjustPopupPosition();
    
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
        if (feature && feature.get('type') && visibilityModulesInfo) {
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
        if (!currentPopupFeature && visibilityModulesInfo) {
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
    
    // Если карта движется и popup открыт - корректируем его позицию
    if (isDraggingMove && currentPopupFeature) {
        adjustPopupPosition();
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
    let idModule = currentPopupFeature.get('id');
    cachedModules = cachedModules.filter(m => m.id_module !== idModule);
    
    const popupElement = popup.getElement();
    popupElement.style.display = 'none';
    
    deleteModuleFromDB(idModule);
    
    // Сбрасываем текущие данные
    currentModuleInfo = null;
    currentPopupFeature = null;
    
    // Закрываем диалог
    closeDeleteModuleDialog();
}
async function deleteModuleFromDB(id) {
    try {
        // Проверка на ID
        if (!id) {
            throw new Error('Id модуля не найден');
        }

        const response = await fetch('http://localhost:5050/maps/redactor/page/delete_module', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id_module: id
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Не удалось удалить модуль');
        }

        // Успешное удаление
        const result = await response.json();
        sendNotification('Модуль успешно удален', true);
        return result;

    } catch (error) {
        console.error('Delete module error:', error);
        sendNotification(`Ошибка удаления: ${error.message}`, false);
        throw error;
    }
}