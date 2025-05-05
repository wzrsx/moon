document.addEventListener('DOMContentLoaded', function() {
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
          const moduleType = {
            module_type: radio.value,
          };
    
          console.log("Выбран модуль:", moduleType);
          await toggleExclusionRadius(true, cachedModules, moduleType);
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
    layer.setOpacity(isVisible ? 0.7 : 0);
};