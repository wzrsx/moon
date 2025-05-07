document.addEventListener('DOMContentLoaded', function() {
  const place = sessionStorage.getItem('temp_selected_place');
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
        if (!radio) return;
    
        if (radio.checked) {
          isDragging = true; //для updateClippedLayer при перемещении карты
          const moduleType = {
            module_type: radio.value,
          };
          await toggleExclusionRadius(true, cachedModules, moduleType);
          
          if (moduleType.module_type === 'medical_module' || moduleType.module_type === 'repair_module') {
            onlyGreenInZone = true;
            await updateClippedLayer();
          }
          else{
            onlyGreenInZone = false;
            await updateClippedLayer();
          }
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
    if(layer.get("name") !== 'greenLayer' && isVisible){
      showPlacesZone(layer.get("name").replace("Layer", ""));
    }else{
      layer.setOpacity(isVisible ? 0.7 : 0)
    }
};
