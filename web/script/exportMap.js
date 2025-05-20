let loadedImagesCache = {};
let extent;
let selectedFormat;
async function exportMapToPNG(needDownload = true) {
  extent = map.getView().get('extent');
  // Проверяем, есть ли модули
  if (!cachedModules || cachedModules.length === 0) {
      alert('Нет модулей для экспорта');
      return;
  }

  // Находим границы всех модулей
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  cachedModules.forEach(module => {
      const [x, y] = module.points;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
  });

  // 1. Свои границы (координаты X1, X2, Y1, Y2)
  if (checkboxBbox && checkboxBbox.checked) {
      extent = getUserBboxValues();
  } 
  else {
      extent = calculateExtentWithMargins(minX, minY, maxX, maxY);
  }

  // Вычисляем размеры изображения
  const width = 2000;
  let height;

  
  height = Math.round(width * (extent[3] - extent[1]) / (extent[2] - extent[0]));

    try {
      // Загружаем слои как изображения
      const ldem_img = await getImageMap('ldem-83s', extent);
      const hill_img = await getImageMap('ldem-hill', extent);
      const ldsm_img = await getImageMap('ldsm-83s', extent);
      // Создаём canvas и комбинируем изображения
      const resultCanvas = combineImages(ldem_img, hill_img, ldsm_img, width, height);
      
      if (moduleLayers.length === 0) {
        console.warn('Слой модулей не найден или пуст');
        sendNotification("Нет модулей для экспорта", false);
        return;
      }
  
      const source = moduleLayers[0].getSource();
      const features = source.getFeatures();
      // Проверяем, есть ли объекты, пересекающиеся с текущим extent
      const hasIntersectingFeature = features.some(feature => {
        const geometry = feature.getGeometry();
        if (!geometry) return false;

        // Пример грубой проверки: бокс пересечения
        const featureExtent = geometry.getExtent();
        return ol.extent.intersects(extent, featureExtent);
      });
      if (hasIntersectingFeature) {
        // Только если есть пересекающиеся модули — рисуем
        const view = map.getView();
        const exportZoom = 14;
        const resolution = (extent[2] - extent[0]) / width;

        // Предзагрузка иконок
        await preloadIcons(features, createModuleStyleFunction, exportZoom, resolution);

        // Отрисовываем векторные объекты
        drawVectorLayerOnCanvas(resultCanvas, map, extent);
      } else {
        console.log('Нет модулей в указанном охвате — слой модулей не рисуется');
      }
      if(needDownload){
      // Скачиваем результат
      const link = document.createElement('a');
      link.href = resultCanvas.toDataURL('image/png');
      link.download = 'modules_export.png';
      link.click();  
      console.log("Экспорт успешен");
      }else{
        return resultCanvas;
      }
    } catch (err) {
      console.error("Ошибка при экспорте:", err);
      alert('Произошла ошибка при экспорте');
    }
}
function combineImages(baseImage, hillshadeImage, ldsmImage, width, height) {
  // Создаем canvas для результата
  const canvas = document.createElement('canvas');
  canvas.width = baseImage.width;
  canvas.height = baseImage.height;
  const ctx = canvas.getContext('2d');
  
  // 1. Рисуем базовый слой 
  ctx.drawImage(baseImage, 0, 0);
  
  // 2. Применяем слой LDSM 
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(ldsmImage, 0, 0);
  ctx.restore();
  
  // 3. Применяем слой hillshade 
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.globalCompositeOperation = 'lighten';
  ctx.drawImage(hillshadeImage, 0, 0);
  ctx.restore();
  return canvas;
}
async function getImageMap(layerName, extent, targetSize = 2048) {//targetSize для разрешения фото
    const [minX, minY, maxX, maxY] = extent;
    const extentWidth = maxX - minX;
    const extentHeight = maxY - minY;
    const aspectRatio = extentWidth / extentHeight;
    
    let width, height;
    if (aspectRatio > 1) {
        width = targetSize;
        height = Math.round(targetSize / aspectRatio);
    } else {
        height = targetSize;
        width = Math.round(targetSize * aspectRatio);
    }

    const wmsUrl = new URL('http://localhost:8080/geoserver/wms');
    const params = new URLSearchParams({
        SERVICE: 'WMS',
        VERSION: '1.3.0',
        REQUEST: 'GetMap',
        LAYERS: `moon-workspace:${layerName}`,
        FORMAT: 'image/png',
        TRANSPARENT: 'true',
        WIDTH: width.toString(),
        HEIGHT: height.toString(),
        BBOX: extent.join(','),
        SRS: 'EPSG:100000'
    });

    wmsUrl.search = params.toString();

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image for layer ${layerName}`));
        img.src = wmsUrl.toString();
    });
}


//модули
function drawVectorLayerOnCanvas(canvas, map, extent) {
  const ctx = canvas.getContext('2d');
  const view = map.getView();
 
  const source = moduleLayers[0].getSource();
  const features = source.getFeatures();

  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  // Простое проецирование: преобразование координат в пиксели
  function coordinateToPixel(coord) {
    const x = ((coord[0] - extent[0]) / (extent[2] - extent[0])) * canvasWidth;
    const y = ((extent[3] - coord[1]) / (extent[3] - extent[1])) * canvasHeight;
    return [x, y];
  }

  // Текущее разрешение (для выбора стиля)
  const resolution = (extent[2] - extent[0]) / canvasWidth;
  const zoom = Math.round(view.getZoomForResolution(resolution));
  console.log("zoom", zoom);
  features.forEach(feature => {
    const styles = createModuleStyleFunction(zoom)(feature, resolution);
    const styleArray = Array.isArray(styles) ? styles : [styles];
  
    styleArray.forEach(style => {
      let geometry = feature.getGeometry();
      
      // Проверка наличия геометрии
      if (!geometry) {
        console.warn('Feature has no geometry', feature);
        return;
      }
  
      // Применение геометрии из стиля, если есть
      if (style.getGeometryFunction()) {
        const customGeometry = style.getGeometryFunction()(feature);
        if (customGeometry) {
          geometry = customGeometry;
        }
      }
  
      // Проверка типа геометрии
      if (!(geometry instanceof ol.geom.Geometry)) {
        console.warn('Invalid geometry type', geometry);
        return;
      }
  
      const geomType = geometry.getType();
  
      try {
        const coords = geometry.getCoordinates();
        if (geomType !== 'Polygon') {
            const pixel = coordinateToPixel(coords);
            drawPoint(ctx, style, pixel, zoom);
        } else if (geomType === 'Polygon') {
            const exteriorRing = coords[0]; 
            const pixelCoords = exteriorRing.map(coord => coordinateToPixel(coord));
            drawPolygon(ctx, style, pixelCoords);
        }
      } catch (e) {
        console.error('Error drawing geometry', e, feature);
      }
    });
  });
}

// Вспомогательные функции для отрисовки
function drawPoint(ctx, style, pixel, zoom) {
  const imageStyle = style.getImage();
  const textStyle = style.getText(); 
  let polygon;
  if (!imageStyle) {
    //для зума >17 берем квадрат полигон
    polygon = style.getGeometry();
    if(!polygon){
      console.warn('Нет изображения/полигона в стиле');
      return;
    }
    
  }

  // Если это Icon
  if (imageStyle instanceof ol.style.Icon) {
    const iconSrc = imageStyle.getSrc();
    const img = loadedImagesCache[iconSrc];

    if (!img || !img.complete || !img.width || !img.height) {
      console.warn("Изображение не загружено или неверно", iconSrc);
      return;
    }
    const iconScale = 0.1 * Math.pow(0.8, 16 - zoom);
    // Вычисляем новые размеры с учётом scale
    const scaledWidth = img.width * iconScale;
    const scaledHeight = img.height * iconScale;
    ctx.drawImage(
      img,
      pixel[0] - scaledWidth / 2,
      pixel[1] - scaledHeight / 2,
      scaledWidth,
      scaledHeight
    );
    // Отрисовка текста
    if (textStyle) {
      drawText(ctx, textStyle, pixel, scaledWidth, scaledHeight);
    }
  } else if (imageStyle instanceof ol.style.Circle) {
    console.log("circle");
    const radius = imageStyle.getRadius();
    const fill = imageStyle.getFill();
    const stroke = imageStyle.getStroke();

    ctx.beginPath();
    ctx.arc(pixel[0], pixel[1], radius, 0, Math.PI * 2);

    if (fill) {
      ctx.fillStyle = fill.getColor();
      ctx.fill();
    }

    if (stroke) {
      ctx.strokeStyle = stroke.getColor();
      ctx.lineWidth = stroke.getWidth();
      ctx.stroke();
    }
    // Отрисовка текста
    if (textStyle) {
      drawText(ctx, textStyle, pixel, radius * 2, radius * 2);
    }
  } 
  
}

function drawPolygon(ctx, style, pixels) {
  if (!pixels || pixels.length === 0) return;
  const textStyle = style.getText();
  const fill = style.getFill();
  
  if (!fill) return;
  
  ctx.beginPath();
  
  // Рисуем полигон
  ctx.moveTo(pixels[0][0], pixels[0][1]);
  for (let i = 1; i < pixels.length; i++) {
      ctx.lineTo(pixels[i][0], pixels[i][1]);
  }
  ctx.closePath();
  
  if (fill) {
      ctx.fillStyle = fill.getColor();
      ctx.fill();
  }
  // Отрисовка текста
  if (textStyle) {
    ctx.font = textStyle.getFont();
    const fill = textStyle.getFill();
    ctx.fillStyle = fill.getColor() 
    const text = textStyle.getText();
    const textWidth = ctx.measureText(text).width;
    
    const centerX = (pixels[0][0] + pixels[2][0]) / 2; 
    const topY = Math.min(...pixels.map(p => p[1])); 
    
    const textX = centerX - textWidth/2;
    const textY = topY - 5; // 5px отступа сверху
    const stroke = textStyle.getStroke();
    if (stroke) {
      ctx.strokeStyle = stroke.getColor();
      ctx.lineWidth = stroke.getWidth();
      ctx.strokeText(text, textX, textY);
    }
    ctx.fillText(text, textX, textY);
  }
}
function drawText(ctx, textStyle, pixel, iconWidth = 0, iconHeight = 0) {
  if (!textStyle || !pixel) return;

  const text = textStyle.getText();
  if (!text) return;

  try {
    ctx.font = textStyle.getFont();
    const fill = textStyle.getFill();
    if (fill) {
      ctx.fillStyle = fill.getColor() || '#000000';
    }
    // Рассчитываем размеры текста
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    const offsetX = textStyle.getOffsetX() || 0;
    const offsetY = textStyle.getOffsetY() || 0;
    // Вычисляем позицию текста по центру под иконкой
    const textX = pixel[0] - textWidth / 2 + offsetX;
    const textY = pixel[1] + iconHeight / 2 + offsetY; 
    // Рисуем обводку (если есть)
    const stroke = textStyle.getStroke();
    if (stroke) {
      ctx.strokeStyle = stroke.getColor();
      ctx.lineWidth = stroke.getWidth();
      ctx.strokeText(text, textX, textY);
    }

    // Рисуем основной текст
    ctx.fillText(text, textX, textY);

  } catch (error) {
    console.error('Ошибка отрисовки текста:', error);
  }
}
function preloadIcons(features, createStyleFunction, zoom, resolution) {
  const promises = [];
  loadedImagesCache = {}; 
  features.forEach(feature => {
    const style = createStyleFunction(zoom)(feature, resolution);
    const imageStyle = style.getImage();

    if (imageStyle instanceof ol.style.Icon) {
      const iconSrc = imageStyle.getSrc(); // Получаем исходный путь к изображению

      // Создаём новое изображение и начинаем загрузку вручную
      const img = new Image();
      img.src = iconSrc;
      loadedImagesCache[iconSrc] = img;
      // Для отладки
      console.log("Загружаем иконку:", iconSrc);

      promises.push(new Promise(resolve => {
        if (img.complete && img.naturalWidth !== 0) {
          console.log("Иконка уже загружена:", iconSrc);
          resolve();
          return;
        }

        img.onload = () => {
          console.log("Иконка загружена:", iconSrc);
          resolve();  
        };

        img.onerror = () => {
          console.warn("Ошибка загрузки иконки:", iconSrc);
          resolve();
        };
      }));
    }
  });

  return Promise.all(promises);
}
    // Элементы отступов
const ranges = {
    marginTop: { valEl: document.getElementById('topVal') },
    marginRight: { valEl: document.getElementById('rightVal') },
    marginBottom: { valEl: document.getElementById('bottomVal') },
    marginLeft: { valEl: document.getElementById('leftVal') }
};
Object.keys(ranges).forEach(id => {
  const input = document.getElementById(id);
  input.addEventListener('input', function () {
      ranges[id].valEl.textContent = parseFloat(this.value).toFixed(1);
  });
});

function getUserBboxValues() {
  const MAX_ABS_VALUE = Math.max.apply(Math, extent);
  const inputs = [
      { id: 'x1Input', name: 'Min X' },
      { id: 'x2Input', name: 'Max X' },
      { id: 'y1Input', name: 'Min Y' },
      { id: 'y2Input', name: 'Max Y' }
  ];

  const values = {};
  let isValid = true;

  // Проверка всех инпутов
  inputs.forEach(inputConfig => {
      const inputElement = document.getElementById(inputConfig.id);
      const value = parseFloat(inputElement.value);
      values[inputConfig.id] = value;

      // Проверка на число
      if (isNaN(value)) {
          showError(inputElement, 'Введите число');
          isValid = false;
          return;
      }

      // Проверка глобального охвата карты
      if (Math.abs(value) > MAX_ABS_VALUE) {
          showError(inputElement, `Значение должно быть между ${-MAX_ABS_VALUE} и ${MAX_ABS_VALUE}`);
          isValid = false;
          return;
      }
      // Проверка текущего охвата карты
      if (inputConfig.id === 'x1Input' && value < extent[0]) {
          showError(inputElement, `Min X не может быть меньше ${extent[0]}`);
          isValid = false;
          return;
      }

      if (inputConfig.id === 'x2Input' && value > extent[2]) {
          showError(inputElement, `Max X не может быть больше ${extent[2]}`);
          isValid = false;
          return;
      }

      if (inputConfig.id === 'y1Input' && value < extent[1]) {
          showError(inputElement, `Min Y не может быть меньше ${extent[1]}`);
          isValid = false;
          return;
      }

      if (inputConfig.id === 'y2Input' && value > extent[3]) {
          showError(inputElement, `Max Y не может быть больше ${extent[3]}`);
          isValid = false;
          return;
      }

      hideError(inputElement);
  });

  // Проверка соотношений Min/Max
  if (values.x1Input >= values.x2Input) {
      showError(document.getElementById('x1Input'), 'Min X должен быть меньше Max X');
      showError(document.getElementById('x2Input'), 'Max X должен быть больше Min X');
      isValid = false;
  }

  if (values.y1Input >= values.y2Input) {
      showError(document.getElementById('y1Input'), 'Min Y должен быть меньше Max Y');
      showError(document.getElementById('y2Input'), 'Max Y должен быть больше Min Y');
      isValid = false;
  }

  if (!isValid) return null;

  return [
      values.x1Input,
      values.y1Input,
      values.x2Input,
      values.y2Input
  ];
}
// Функция для отображения ошибки под инпутом
function showError(inputElement, message) {
    const wrapper = inputElement.closest('.input-wrapper');
    let errorDiv = wrapper.querySelector('.input-error');
    inputElement.style.borderColor = '#8b0000';
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'input-error';
        errorDiv.style.cssText = 'color: #8b0000; font-size: 14px; height: 12px;';
        wrapper.appendChild(errorDiv);
    }

    errorDiv.textContent = message;
}

// Функция для скрытия ошибки
function hideError(inputElement) {
  const wrapper = inputElement.closest('.input-wrapper');
  let errorDiv = wrapper.querySelector('.input-error');
  if (errorDiv) {
    errorDiv.textContent = '';
  }
  inputElement.style.borderColor = 'white';
}
function calculateExtentWithMargins(minX, minY, maxX, maxY) {
  // Получаем значения отступов
  const top = parseFloat(document.getElementById('marginTop').value);
  const right = parseFloat(document.getElementById('marginRight').value);
  const bottom = parseFloat(document.getElementById('marginBottom').value);
  const left = parseFloat(document.getElementById('marginLeft').value);
  let newMinX;
  let newMinY;
  let newMaxX;
  let newMaxY;
  // Вычисляем размеры исходного прямоугольника
  const width = maxX - minX;
  const height = maxY - minY;
  if (width === 0 && height === 0) {
    const padding = 500;
    // Расширяем границы
    newMinX = minX - padding; 
    newMinY = minY - padding; 
    newMaxX = maxX + padding; 
    newMaxY = maxY + padding; 
    sendNotification("У вас 1 модуль, охват зоны вокруг увеличен на 500м", 1);
  }
  else{
    newMaxY = maxY + (height * top / 100);
    newMinX = minX - (width * left / 100);
    newMinY = minY - (height * bottom / 100);
    newMaxX = maxX + (width * right / 100);
  }
  // Ограничиваем значения
  extent = [
    Math.max(extent[0], newMinX),
    Math.max(extent[1], newMinY),
    Math.min(extent[2], newMaxX),
    Math.min(extent[3], newMaxY)
  ];
  return extent;
}

//для JSON экспорта
async function exportMapToJSON() {
  try {
    const result = await mergeModuleData();

    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${result.name_map}_export.json`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Ошибка экспорта:', err);
    alert('Не удалось экспортировать данные');
  }
}
// ==== Функция mergeModuleData ====
async function mergeModuleData() {
  try {
    // Запрашиваем имя карты с сервера
    const response = await fetch("http://localhost:5050/maps/get_map_name", {
      method: "GET",
      credentials: "include"
    });

    if (!response.ok) {
      throw new Error("Ошибка при получении имени карты");
    }

    const data = await response.json();
    const mapName = data.name_map || "Безымянная_карта";

    // Создаём Map для ускорения поиска по module_type
    const infoMap = new Map();
    cachedInfoModules.forEach(info => {
      infoMap.set(info.module_type, info);
    });

    // Объединяем данные модулей
    const modules = cachedModules.map(module => {
      const info = infoMap.get(module.module_type);

      if (!info) {
        console.warn(`Нет информации для module_type: ${module.module_type}`);
        return null;
      }
      const [lon, lat] = proj4(stereMoonSouth, geodeticLunar, module.points);
      return {
        module_type: module.module_type,
        habitation_type: module.habitation_type,
        points_in_proj: module.points,
        points_in_selenographic: {
          latitude: `Широта: ${Math.abs(lat).toFixed(6)}°`, 
          longitude: `Долгота: ${lon.toFixed(6)}°`
        },
        module_name: info.module_name,
        description: info.description,
        length_meters: info.length_meters,
        width_meters: info.width_meters,
        max_slope_degrees: info.max_slope_degrees
      };
      }).filter(Boolean); // Убираем null

    // Возвращаем результат
    return {
      name_map: mapName,
      modules: modules
    };

  } catch (error) {
    console.error("Ошибка при получении имени карты:", error);
    // Если произошла ошибка, возвращаем fallback значение
    return {
      name_map: "Безымянная_карта",
      modules: []
    };
  }
}
// ==== Конец функции mergeModuleData ====


// Функции для выбора формата
function selectJSON() {
  document.getElementById('parametrsToExportPNG').style.display = 'none';
  selectedFormat = 'json';
}
//Экспорт PDF
async function exportMapToPDF(imgData, modulesData) {
  const imgWidth = imgData.width;
  const imgHeight = imgData.height;

  const isLandscape = imgWidth > imgHeight;
  const orientation = isLandscape ? 'landscape' : 'portrait';
  const doc = new window.jspdf.jsPDF({
    orientation: orientation,
    unit: 'mm',
    format: 'a4'
  });
  doc.addFont("ofont.ru_Roboto-normal.ttf", "ofont.ru_Roboto", "normal");
  doc.setFont("ofont.ru_Roboto");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Вычисляем коэффициент масштабирования для первой страницы
  const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
  const scaledWidth = imgWidth * ratio;
  const scaledHeight = imgHeight * ratio;

  // Центрируем изображение по центру страницы
  const xOffset = (pageWidth - scaledWidth) / 2;
  const yOffset = (pageHeight - scaledHeight) / 2;
  // Добавляем изображение как первую страницу
  doc.addImage(imgData, 'PNG', xOffset, yOffset, scaledWidth, scaledHeight);
  doc.addPage();

  doc.setFontSize(16);
  doc.text(`Проект: ${modulesData.name_map}`, 10, 10);
  doc.setFontSize(14);
  doc.text("Описание модулей: ", 10, 20);

  doc.setFontSize(12);
  let y = 30; 

  // Функция для загрузки изображения и преобразования его в Base64
  async function loadImageAsBase64(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load image from ${url}`);
      }
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  // Проходим по каждому модулю
  for (const module of modulesData.modules) {
      // Путь к изображению модуля
      const moduleImagePath = `/static/style/photos/modules_compressed/${module.module_type}.png`;

      // Загружаем изображение модуля
      const moduleImageBase64 = await loadImageAsBase64(moduleImagePath);

      if (moduleImageBase64) {
          // Размеры изображения модуля
          const moduleImgWidth = 50; // Ширина изображения модуля в мм
          const moduleImgHeight = 50; // Высота изображения модуля в мм

          // Добавляем изображение модуля
          doc.addImage(moduleImageBase64, 'PNG', 10, y, moduleImgWidth, moduleImgHeight);

          // Текст будет начинаться после изображения
          const textXOffset = 10 + moduleImgWidth + 5; // Отступ между изображением и текстом

          const textLines = [
              `Название: ${module.module_name}`,
              `Координаты (проекция): ${module.points_in_proj}`,
              `Координаты (широта/долгота): ${module.points_in_selenographic.latitude}  ${module.points_in_selenographic.longitude}`,
              `Тип: ${module.module_type}`,
              `Обитаемый: ${module.habitation_type?.toLowerCase().includes('inhabited') ? 'Да' : 'Нет'}`,
              `Длина: ${module.length_meters} м`,
              `Ширина: ${module.width_meters} м`,
              `Макс. уклон: ${module.max_slope_degrees}°`,
              `Описание: ${module.description}`
          ];

          // Разбиваем текст на строки, чтобы он поместился в рамки страницы
          const maxTextWidth = pageWidth - textXOffset - 10; // Оставшееся пространство для текста
          let linesDrawn = 0; // Счетчик выведенных строк

          // Выводим текст
          textLines.forEach(line => {
              const splitText = doc.splitTextToSize(line, maxTextWidth); // Автоматический перенос строк
              splitText.forEach((textPart, index) => {
                  doc.text(textPart, textXOffset, y + index * 4); // Каждая строка с отступом 4 мм
                  linesDrawn += 1; // Увеличиваем счетчик выведенных строк
              });
              y += splitText.length * 4 + 5; // Добавляем отступ между блоками
          });

          // Проверяем, достаточно ли места для линии
          if (y + 10 > pageHeight - 20) { // Оставляем 20 мм свободного пространства
              doc.addPage(); // Переходим на новую страницу
              y = 20; // Стартовая позиция на новой странице
          }

          // Рисуем линию по всей ширине страницы
          doc.setLineWidth(0.5); // Толщина линии
          doc.line(10, y, pageWidth - 10, y); // Линия от левого края до правого края
          y += 10; // Дополнительный отступ после линии

          // Проверяем, достаточно ли места для следующего модуля
          if (y > pageHeight - 20) { // Оставляем 20 мм свободного пространства
              doc.addPage(); // Переходим на новую страницу
              y = 20; // Стартовая позиция на новой странице
          }
      } else {
          console.warn(`Изображение для модуля "${module.module_name}" не найдено`);
      }
  }

  // Сохраняем PDF
  doc.save(`${modulesData.name_map}_export.pdf`);
}

function showParametrsPDF() {
  document.getElementById('parametrsToExportPNG').style.display = 'none';
  selectedFormat = 'pdf';
}
function showParametrsPNG(){
    selectedFormat = 'png';
    document.getElementById('parametrsToExportPNG').style.display = 'block';
}
async function exportMapToSelectedFormat(){
  if (!selectedFormat) {
    alert('Пожалуйста, выберите формат для экспорта');
    return;
  }

  switch(selectedFormat) {
      case 'png':
          exportMapToPNG();
          break;
      case 'json':
          exportMapToJSON();
          break;
      case 'pdf':
          exportMapToPDF(await exportMapToPNG(false), await mergeModuleData());
          break;
      default:
          alert('Выбран неизвестный формат');
  }
}

