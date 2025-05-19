let bboxVisibilityModulesInfo;
let checkboxBbox;
let toggleBtn;
let inputsExtent;
let arrow;
let inputsBbox;
document.addEventListener('DOMContentLoaded', function() {
  const place = sessionStorage.getItem('temp_selected_place');
  checkboxBbox = document.getElementById('bboxUserMapExport');
  bboxVisibilityModulesInfo = document.getElementById('bboxVisibilityModulesInfo');
  toggleBtn = document.getElementById('toggleExtentButton');
  inputsExtent = document.getElementById('customExtentInputs');
  arrow = toggleBtn.querySelector('.toggle-extent-arrow');
  inputsBbox = document.getElementById('customBboxInputs');

  checkboxBbox.addEventListener('change', function () {
    inputsBbox.style.display = this.checked ? 'block' : 'none';
    toggleBtn.style.display = this.checked ? 'none' : 'flex';
    if (!this.checked) {
        arrow.classList.remove('collapsed');
    }
    inputsExtent.style.display = 'none';
    updateDialogHeight();
  });
  
  toggleBtn.addEventListener('click', () => {
    const isVisible = inputsExtent.style.display === 'block';
    inputsExtent.style.display = isVisible ? 'none' : 'block';
    updateDialogHeight();
    arrow.classList.toggle('collapsed', !isVisible);
});
  if (place) {
      // Ждём, пока карта точно будет готова
      const checkMapReady = setInterval(() => {
          if (map && map.getView()) {
              clearInterval(checkMapReady);
              showPlacesZone(place);
              sessionStorage.removeItem('temp_selected_place');
          }
      }, 100); // Проверяем каждые 100 мс
  }
    getRequirements();
    document.querySelectorAll('input[type="checkbox"][data-layer]').forEach(checkbox => {
        checkbox.addEventListener('change', function () {
          const layerName = this.dataset.layer;
          toggleLayer(layerName, this.checked);
        });
      });
      document.getElementById('checkboxesModulesName').addEventListener('change', async function(e) {
        const radio = e.target.closest('input[type="radio"]');
        if (!radio || !radio.checked) return;
    
        // Отменяем предыдущую операцию
        if (abortController) {
            abortController.abort();
        }
        abortController = new AbortController();
    
        try {
            showSatelliteSpinner("Подготовка...");
            const moduleType =  radio.value;
            const moduleNameRu =  document.querySelector(`label[for="${radio.id}"]`).textContent;
            currentModuleType = radio.getAttribute('data-module-habitation');
            isDragging = true;
            await toggleExclusionRadius(true, cachedModules, moduleType, {
                signal: abortController.signal
            });
            showSatelliteSpinner(`${moduleNameRu}: обновление зон...`);
            onlyGreenInZone = ['medical_module', 'repair_module'].includes(moduleType);
            if (moduleType === 'medical_module') {
              sendNotification('Медицинский модуль должен быть расположен только вблизи других модулей.', 1);
            } else if (moduleType === 'repair_module') {
              sendNotification('Ремонтный модуль должен быть расположен только вблизи других модулей.', 1);
            }
            // Создаем и добавляем новый clippedLayer
            await updateClippedLayer({
                signal: abortController.signal
            });
    
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Ошибка:', err);
            }
            isDragging = false;
        } finally{
          setTimeout(() => {
            if (!document.getElementById('loadingSpinner').classList.contains('hidden')) {
                hideSatelliteSpinner();
            }
        }, 500);
        }
    });
});


function toggleLayer(layerName, isVisible) {
    const layers = map.getLayers().getArray();
    const layer = layers.find(layer => layer.get("name") === layerName);
    if (!layer) {
        console.error("Layer not found:", layerName);
        return;
    }
    if((layer.get("name") !== 'greenLayerTech' && layer.get("name") !== 'greenLayerInhabit') && isVisible){
      showPlacesZone(layer.get("name").replace("Layer", ""));
    }else{
      layer.setOpacity(isVisible ? 0.7 : 0)
    }
};

function updateDialogHeight() {
  const bboxVisible = checkboxBbox.checked;
  const extentVisible = inputsExtent.style.display === 'block';

  if (bboxVisible && extentVisible) {
      saveDialog.style.height = '80%';
  } else if (bboxVisible) {
      saveDialog.style.height = '60%';
  } else if(extentVisible){
      saveDialog.style.height = '60%'; 
  }else{
    saveDialog.style.height = ''; 
}
}
