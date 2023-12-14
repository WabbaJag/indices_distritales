let distritosIndicesData;

document.addEventListener('DOMContentLoaded', async function () {
  const selectProvincia = document.getElementById('selectProvincia');
  const selectCanton = document.getElementById('selectCanton');
  const selectDistrito = document.getElementById('selectDistrito');
  const selectMes = document.getElementById('selectMes');
  const buttonReset = document.getElementById('reset');
  const provinceIds = [1, 2, 3, 4, 5, 6, 7];

  const initialView = {
    center: [9.5, -84.5],
    zoom: 8,
  };

  const map = L.map('map').setView(initialView.center, initialView.zoom);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
  }).addTo(map);

  const provinceColors = [
    '#E57373',
    '#FFC300',
    '#81C784',
    '#64B5F6',
    '#9575CD',
    '#FF8A65',
    '#4DB6AC',
  ];

  const geoJsonCache = {
    provincias: {},
    cantones: {},
    distritos: {},
  };

  //information window and all its functions

  var info = L.control();

  info.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'info sm:w-[300px] w-[150px]');
    this.update();
    return this._div;
  };

  info.update = function (props) {
    let contents =
      '<p class=" font-catie sm:text-xl text-base">Seleccione un distrito y un mes para conocer su índice</p>';

    if (props) {
      contents = '<p></p>';
      if (props.provincia) {
        contents += `<p class="font-catie w-full font-bold text-background uppercase sm:text-xl text-lg">${props.provincia}</p>`;
      }
      if (props.canton && props.provincia) {
        contents += `<p class="font-catie w-full font-bold text-background uppercase sm:text-xl text-lg">${props.canton}</p>`;
      }
      contents += `<p class="font-catie w-full font-bold text-secondary uppercase sm:text-xl text-lg">${props.name}</p>`;

      if (props.canton && props.provincia && props.indice) {
        const backgroundColor = props.color ? props.color.toLowerCase() : 'white';
        const colorStyle = `background-color: ${backgroundColor};`;
        if (props.indice === 1) {
          contents += `<p class="font-catie w-[60%] sm:text-2xl text-lg my-4 text-background uppercase border-2 border-background mx-auto" style="${colorStyle}">DESCONOCIDO</p>`;
        } else {
          contents += `<p class="font-catie w-[60%] sm:text-2xl text-lg my-4 text-background uppercase border-2 border-background mx-auto" style="${colorStyle}">Índice: ${props.indice}</p>`;
        }

      } else if (props.canton && props.provincia && !props.indice) {
        contents += `<p class="font-catie w-1/2 sm:text-xl text-base text-background sm:pt-4 mx-auto text-center italic">Seleccione un mes para ver el índice</p>`;
      }
      if (props.mes) {
        contents += `<p class="font-catie w-full text-background sm:text-lg text-base">${props.mes}, 2023</p>`;
      }
    }

    this._div.innerHTML = `<h3 class=' font-catie sm:text-3xl text-xl font-bold text-center sm:pb-8 pb-4'>Índice Distrital de Riesgo</h3>${contents}`;
  };

  info.addTo(map);

  //legend window

  var legend = L.control({ position: 'bottomleft' });


  legend.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'info legend w-[215px] text-lg'),
      grades = [0, 0.168, 0.336, 0.504, 0.672, 0.840, 1];

    function generateRangeText(start, end, label) {
      return `<p class="font-catie font-bold text-left">${start.toFixed(3)} &ndash; ${end.toFixed(3)} | ${label}</p>`;
    }

    for (var i = 1; i < grades.length; i++) {
      var rangeText;

      if (grades[i] === 0.168) {
        rangeText = generateRangeText(grades[i - 1], grades[i], 'Bajo');
      } else if (grades[i] < 1) {
        const labels = ['Bajo', 'Medio Bajo', 'Medio', 'Medio Alto', 'Alto'];
        rangeText = generateRangeText(grades[i], grades[i + 1], labels[i - 1]);
      } else {
        rangeText = '<p class="font-catie font-bold text-left">Desconocido</p>';
      }

      const color = getColor(grades[i]);
      div.innerHTML += `<i style="background:${color}; border: 1px solid #000;"></i> ${rangeText}`;
    }

    return div;
  };

  legend.addTo(map);

  //Functions for highlighting, resetinghighlight and zooming on GEOJSON AREAS

  function highlight(e) {
    var layer = e.target;

    layer.setStyle({
      weight: 5,
    });

    layer.bringToFront();
    info.update(layer.feature.properties);
  }

  function resetHighlight(e) {
    var layer = e.target;
    var weight;
    if (layer.options.color === 'black') {
      weight = 3;
    } else {
      weight = 1;
    }

    layer.setStyle({
      weight: weight,
    });
  }

  function zoomTo(e) {
    var layer = e.target;
    var name = layer.feature.properties.name;
    var id = layer.feature.properties.id;

    var options, selectElement, event;

    if (id < 10) {
      options = selectProvincia.options;
      selectElement = selectProvincia;
      event = 'changeProvincia';
    } else if (id >= 100 && id < 800) {
      options = selectCanton.options;
      selectElement = selectCanton;
      event = 'changeCanton';
    } else if (id >= 800) {
      options = selectDistrito.options;
      selectElement = selectDistrito;
      event = 'changeDistrito';
    } else {
      console.error('Invalid id:', id);
      return;
    }
    if (selectElement.selectedIndex.text != name) {
      for (var i = 1; i < options.length; i++) {
        if (options[i].text === name) {
          selectElement.selectedIndex = i;
          document.dispatchEvent(new Event(event));
          break;
        }
      }
    }

    setTimeout(function () {
      map.fitBounds(layer.getBounds(), {
        animate: true,
        duration: 1.5,
        easeLinearity: 0.1,
      });
    }, 50);
  }

  //Function to navigate back to selectors
  var scrollButton = L.control({ position: 'bottomright' });

  scrollButton.onAdd = function (map) {
    var container = L.DomUtil.create('div', '');

    container.innerHTML = '<button id="scrollToMenu" class="bg-primary rounded-full p-4 border-2 border-secondary hover:bg-primaryLight lg:hidden">' +
      '<img src="./styles/images/arrow-down.svg" alt="Up Arrow" class="w-6 h-6 rotate-180" />' +
      '</button>';

    return container;
  };

  scrollButton.addTo(map);

  function scrollTo(element) {
    window.scroll({
      behavior: 'smooth',
      left: 0,
      top: element.offsetTop
    });
  }

  document.getElementById("scrollToMenu").addEventListener('click', () => {
    scrollTo(document.getElementById("menu"));
  });

  //FUNCTION TO ADD GEOJSON TO MAP
  function addGeoJSONToMap(
    data,
    fillColor,
    weight,
    opacity,
    color,
    dashArray,
    fillOpacity,
    additionalData
  ) {
    const layer = L.geoJSON(data, {
      style: {
        fillColor: fillColor,
        weight: weight,
        opacity: opacity,
        color: color,
        dashArray: dashArray,
        fillOpacity: fillOpacity,
      },
      onEachFeature: function (feature, layer) {
        feature.properties = additionalData;

        layer.on({
          mouseover: highlight,
          mouseout: resetHighlight,
          click: zoomTo,
        });
      },
    }).addTo(map);

    return layer;
  }

  try {
    distritosIndicesData = await fetchData('data/distrito_indices.json');
  } catch (error) {
    window.alert('¡¡¡Hubo un error al conseguir los datos en mapscript!!!');
  }

  async function fetchData(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  }

  function removeExistingGeoJSONLayers() {
    map.eachLayer((layer) => {
      if (layer instanceof L.GeoJSON) {
        map.removeLayer(layer);
      }
    });
  }

  async function loadPlace(placeType, placeId, colorId, zoom, additionalData) {
    try {
      let fillColor;
      let data;
      let layer;

      // console.log('in loadPlace receiving additional data: ', additionalData);

      if (Number.isInteger(colorId)) {
        fillColor = provinceColors[colorId - 1];
      } else {
        fillColor = colorId;
      }

      if (geoJsonCache[placeType][placeId]) {
        data = geoJsonCache[placeType][placeId].data;
      } else {
        const response = await fetch(`geojson/${placeType}/${placeId}.json`);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        data = await response.json();
        geoJsonCache[placeType][placeId] = {
          data: data,
          properties: additionalData,
        };
      }

      if (zoom) {
        layer = addGeoJSONToMap(
          data,
          fillColor,
          3,
          1,
          'black',
          '',
          1,
          additionalData
        );
        layer.bringToFront();
      } else {
        let borderColor = 'white';
        layer = addGeoJSONToMap(
          data,
          fillColor,
          1.5,
          1,
          borderColor,
          5,
          0.5,
          additionalData
        );
      }

      if (layer && zoom) {
        info.update(additionalData);
        if (!additionalData.color) {
          map.fitBounds(layer.getBounds(), {
            animate: true,
            duration: 1.5,
            easeLinearity: 0.1,
          });
        }

      }
      if (!colorId) {
        map.removeLayer(layer);
      }
    } catch (error) {
      console.error('Error loading GeoJSON data:', error);
    }
  }

  buttonReset.addEventListener('click', async () => {
    map.setView(initialView.center, initialView.zoom);
    removeExistingGeoJSONLayers();
    provinceIds.forEach((provinceId) => {
      loadPlace('provincias', provinceId, provinceId);
    });
    info.update();
  });

  // LOAD PROVINCIA GEOJSON
  document.addEventListener('provinciasLoaded', () => {
    provinceIds.forEach((provinceId) => {
      loadPlace('provincias', provinceId, provinceId, false, {
        name: selectProvincia.options[provinceId].text,
        id: provinceId,
      });
    });
  });

  // LOAD CANTON GEOJSON
  document.addEventListener('cantonOptionsLoaded', function () {
    const selectedProvinceId = parseInt(selectProvincia.value);
    removeExistingGeoJSONLayers();
    loadPlace('provincias', selectedProvinceId, null, true, {
      name: selectProvincia.options[selectedProvinceId].text,
      id: selectedProvinceId,
    });

    const cantonOptions = selectCanton.options;
    for (let i = 1; i < cantonOptions.length; i++) {
      const concatenatedValue = `${selectedProvinceId}${cantonOptions[i].value}`;
      loadPlace('cantones', concatenatedValue, selectedProvinceId, false, {
        name: cantonOptions[i].text,
        id: concatenatedValue,
        provincia: selectProvincia.options[selectedProvinceId].text,
      });
    }
  });

  // LOAD DISTRITO GEOJSON
  document.addEventListener('distritoOptionsLoaded', function () {
    let selectedProvinceId = parseInt(selectProvincia.value);
    let selectedCantonId = selectCanton.value;
    let id = selectedProvinceId + '' + selectedCantonId;
    removeExistingGeoJSONLayers();
    loadPlace('cantones', id, null, true, {
      name: selectCanton.options[parseInt(selectedCantonId)].text,
      id: selectedCantonId,
      provincia: selectProvincia.options[selectedProvinceId].text,
    });

    const distritoOptions = selectDistrito.options;
    for (let i = 1; i < distritoOptions.length; i++) {
      id = `${selectedProvinceId}${selectedCantonId}${distritoOptions[i].value}`;
      loadPlace('distritos', id, selectedProvinceId, false, {
        name: distritoOptions[i].text,
        id: id,
        provincia: selectProvincia.options[selectedProvinceId].text,
        canton: selectCanton.options[parseInt(selectedCantonId)].text,
      });
    }
  });


  // LOAD MESES
  document.addEventListener('mesOptionsLoaded', function () {
    removeExistingGeoJSONLayers();
    let selectedProvinceId = parseInt(selectProvincia.value);
    let selectedCantonId = selectCanton.value;
    let selectedDistritoId = selectDistrito.value;
    let distritoOptions = selectDistrito.options;
    let distritoID;

    for (let i = 1; i < distritoOptions.length; i++) {
      distritoID = `${selectedProvinceId}${selectedCantonId}${distritoOptions[i].value}`;
      loadPlace('distritos', distritoID, selectedProvinceId, false, {
        name: distritoOptions[i].text,
        id: distritoID,
        provincia: selectProvincia.options[selectedProvinceId].text,
        canton: selectCanton.options[parseInt(selectedCantonId)].text,
      });
    }

    distritoID = `${selectedProvinceId}${selectedCantonId}${selectedDistritoId}`;

    loadPlace('distritos', distritoID, selectedProvinceId, false, {
      name: distritoOptions[parseInt(selectedDistritoId)].text,
      id: distritoID,
      provincia: selectProvincia.options[selectedProvinceId].text,
      canton: selectCanton.options[parseInt(selectedCantonId)].text,
    });
  });

  // LOAD DISTRITO COLORS
  document.addEventListener('colorMap', function () {
    removeExistingGeoJSONLayers();
    let selectedProvinceId = parseInt(selectProvincia.value);
    let selectedCantonId = selectCanton.value;
    let selectedDistritoId = selectDistrito.value;
    let distritoOptions = selectDistrito.options;
    let distritoID, value, additionalData;

    for (let i = 1; i < distritoOptions.length; i++) {
      distritoID =
        selectedProvinceId +
        '' +
        selectedCantonId +
        '' +
        distritoOptions[i].value;
      value = distritosIndicesData.distritos[distritoID][selectMes.value];
      additionalData = {
        name: distritoOptions[i].text,
        id: distritoID,
        indice: value,
        mes: selectMes.value,
        color: getColor(value),
        provincia: selectProvincia.options[selectedProvinceId].text,
        canton: selectCanton.options[parseInt(selectedCantonId)].text,
      }
      loadPlace('distritos', distritoID, getColor(value), false, additionalData);
    }
    distritoID = `${selectedProvinceId}${selectedCantonId}${selectedDistritoId}`;
    value = distritosIndicesData.distritos[distritoID][selectMes.value];
    additionalData = {
      name: distritoOptions[parseInt(selectedDistritoId)].text,
      id: distritoID,
      indice: value,
      mes: selectMes.value,
      color: getColor(value),
      provincia: selectProvincia.options[selectedProvinceId].text,
      canton: selectCanton.options[parseInt(selectedCantonId)].text,
    }

    loadPlace('distritos', distritoID, getColor(value), false, additionalData);
    info.update(additionalData);
  });

  function getColor(d) {
    if (d === 1) {
      return '#808080'; // Gray for special case when d is equal to 1
    } else if (d >= 0 && d <= 0.168) {
      return '#90EE90'; // Light green
    } else if (d > 0.168 && d <= 0.336) {
      return '#008000'; // Green
    } else if (d > 0.336 && d <= 0.504) {
      return '#FFFF00'; // Yellow
    } else if (d > 0.504 && d <= 0.672) {
      return '#FFA500'; // Orange
    } else if (d > 0.672 && d <= 0.840) {
      return '#FF0000'; // Red
    } else {
      // Handle other cases or return a default color
      return '#000000'; // Default color (black) for values outside the specified ranges
    }
  }

});