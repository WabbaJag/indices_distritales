let provinciasCantonesDistritos;
let distritoIndicesData;

document.addEventListener('DOMContentLoaded', async function () {
  const buttonReset = document.getElementById('reset');
  const dropdownProvincia = document.getElementById('selectProvincia');
  const dropdownCanton = document.getElementById('selectCanton');
  const dropdownDistrito = document.getElementById('selectDistrito');
  const dropdownMes = document.getElementById('selectMes');

  defaultOptions();

  function defaultOptions() {
    defaultOption(dropdownProvincia, 'Seleccione una provincia');
    defaultOption(dropdownCanton, 'Seleccione un cantón');
    defaultOption(dropdownDistrito, 'Seleccione un distrito');
    defaultOption(dropdownMes, 'Seleccione un mes');
  }

  //First, fetch the data and fill provincias
  try {
    provinciasCantonesDistritos = await fetchData(
      'data/provincias_cantones_distritos_costa_rica.json'
    );
    distritoIndicesData = await fetchData('data/distrito_indices.json');

    initializeProvincia();
  } catch (error) {
    window.alert('¡¡¡Hubo un error al conseguir los datos!!!');
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

  function defaultOption(selector, text) {
    let option = document.createElement('option');
    option.value = '00';
    option.innerText = text;
    option.selected = true;
    option.disabled = true;
    selector.appendChild(option);
  }

  buttonReset.addEventListener('click', async () => {
    resetSelectors(dropdownCanton, dropdownDistrito, dropdownMes);
    defaultOption(dropdownCanton, 'Seleccione un cantón');
    defaultOption(dropdownDistrito, 'Seleccione un distrito');
    defaultOption(dropdownMes, 'Seleccione un mes');
    initializeProvincia();
  });

  function initializeProvincia() {
    dropdownProvincia.innerHTML = '';

    defaultOption(dropdownProvincia, 'Seleccione una provincia');

    for (const provinciaId in provinciasCantonesDistritos.provincias) {
      const provincia = provinciasCantonesDistritos.provincias[provinciaId];
      let option = document.createElement('option');
      option.value = provinciaId;
      option.innerText = provincia.nombre;
      option.classList.add('sm:text-2xl');
      option.classList.add('text-xl');
      dropdownProvincia.appendChild(option);
    }
    document.dispatchEvent(new Event('provinciasLoaded'));
  }

  function resetSelectors(...selectors) {
    selectors.forEach((selector) => {
      selector.innerHTML = '';
    });
  }

  document.addEventListener('changeProvincia', async () => {
    resetSelectors(dropdownCanton, dropdownDistrito, dropdownMes);

    defaultOption(dropdownCanton, 'Seleccione un cantón');
    defaultOption(dropdownDistrito, 'Seleccione un distrito');
    defaultOption(dropdownMes, 'Seleccione un mes');

    const provinciaId = selectProvincia.value;

    if (
      provinciasCantonesDistritos.provincias[provinciaId] &&
      provinciasCantonesDistritos.provincias[provinciaId].cantones
    ) {
      const cantones =
        provinciasCantonesDistritos.provincias[provinciaId].cantones;

      Object.keys(cantones)
        .sort()
        .forEach((cantonId) => {
          const canton = cantones[cantonId];
          let option = document.createElement('option');
          option.value = cantonId;
          option.innerText = canton.nombre;
          option.classList.add('sm:text-2xl');
          option.classList.add('text-xl');
          dropdownCanton.appendChild(option);
        });
    }
    const event = new Event('cantonOptionsLoaded');
    document.dispatchEvent(event);
  });

  document.addEventListener('changeCanton', async () => {
    resetSelectors(dropdownDistrito, dropdownMes);

    defaultOption(dropdownDistrito, 'Seleccione un distrito');
    defaultOption(dropdownMes, 'Seleccione un mes');

    const provinciaId = dropdownProvincia.value;
    const cantonId = dropdownCanton.value;

    if (
      provinciasCantonesDistritos.provincias[provinciaId] &&
      provinciasCantonesDistritos.provincias[provinciaId].cantones[cantonId] &&
      provinciasCantonesDistritos.provincias[provinciaId].cantones[cantonId]
        .distritos
    ) {
      const distritos =
        provinciasCantonesDistritos.provincias[provinciaId].cantones[cantonId]
          .distritos;

      Object.keys(distritos)
        .sort()
        .forEach((distritoCodigo) => {
          let option = document.createElement('option');
          option.value = distritoCodigo;
          option.innerText = distritos[distritoCodigo];
          option.classList.add('sm:text-2xl');
          option.classList.add('text-xl');
          dropdownDistrito.appendChild(option);
        });
    }
    const event = new Event('distritoOptionsLoaded');
    document.dispatchEvent(event);
  });

  document.addEventListener('changeDistrito', async () => {
    if (dropdownMes.value === '00') {
      populateMesesDropdown();
      document.dispatchEvent(new Event('mesOptionsLoaded'));
    } else {
      document.dispatchEvent(new Event('colorMap'));
    }
  });

  function populateMesesDropdown() {
    const selectMes = document.getElementById('selectMes');
    selectMes.innerHTML = '';

    const defaultMonths = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];

    defaultOption(selectMes, 'Seleccione un mes');

    defaultMonths.forEach((mes) => {
      let option = document.createElement('option');
      option.value = mes;
      option.innerText = mes;
      option.classList.add('sm:text-2xl');
      option.classList.add('text-xl');
      selectMes.appendChild(option);
    });
  }

  selectMes.onchange = async () => {
    let provinciaId = selectProvincia.value;
    let cantonId = selectCanton.value;
    let distritoId =
      provinciaId.toString() + cantonId.toString() + selectDistrito.value;
    let selectedMes =
      distritoIndicesData.distritos[distritoId][selectMes.value];
    document.dispatchEvent(new Event('colorMap'));
  };
});