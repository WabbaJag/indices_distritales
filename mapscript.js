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
    this._div = L.DomUtil.create('div', 'info w-[300px]');
    this.update();
    return this._div;
  };

  info.update = function (props) {
    let contents =
      '<p class=" font-catie text-xl">Seleccione un distrito y un mes para conocer su índice</p>';

    if (props) {
      contents = '<p></p>';
      if (props.provincia) {
        contents += `<p class="font-catie w-full font-bold text-background uppercase text-xl">${props.provincia}</p>`;
      }
      if (props.canton && props.provincia) {
        contents += `<p class="font-catie w-full font-bold text-background uppercase text-xl">${props.canton}</p>`;
      }
      contents += `<p class="font-catie w-full font-bold text-secondary uppercase text-xl">${props.name}</p>`;

      if (props.canton && props.provincia && props.indice) {
        const backgroundColor = props.color ? props.color.toLowerCase() : 'white';
        const colorStyle = `background-color: ${backgroundColor};`;

        contents += `<p class="font-catie w-[60%] text-2xl my-4 text-background uppercase border-2 border-background mx-auto" style="${colorStyle}">Índice: ${props.indice}</p>`;
      } else if (props.canton && props.provincia && !props.indice) {
        contents += `<p class="font-catie w-1/2 text-xl text-background pt-4 mx-auto italic">Seleccione un mes para ver el índice</p>`;
      }
      if (props.mes) {
        contents += `<p class="font-catie w-full text-background text-lg">${props.mes}, 2023</p>`;
      }
    }

    this._div.innerHTML = `<h3 class=' font-catie text-3xl font-bold text-center pb-8'>Índice Distrital de Riesgo</h3>${contents}`;
  };

  info.addTo(map);

  //legend window

  var legend = L.control({ position: 'bottomleft' });

  legend.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'info legend w-[200px]'),
      grades = [0, 20, 40, 60, 80];

    for (var i = 0; i < grades.length; i++) {
      const rangeText = grades[i + 1] ? `<p class="font-catie font-bold text-xl">${grades[i]} &ndash; ${grades[i + 1]}</p>` : `<p class="font-catie font-bold text-xl">${grades[i]}+</p>`;
      div.innerHTML +=
        '<i  style="background:' + getColor(grades[i] + 1) + '"></i> ' + rangeText;
    }
    return div;
  }

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

    loadPlace('distritos', distritoID, selectedProvinceId, true, {
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

    loadPlace('distritos', distritoID, getColor(value), true, additionalData);
    info.update(additionalData);
  });

  function getColor(d) {
    return d >= 80
      ? '#FF0000'
      : d >= 60
        ? '#FFA500'
        : d >= 40
          ? '#FFFF00'
          : d >= 20
            ? '#ADFF2F'
            : '#00FF00';
  }

});