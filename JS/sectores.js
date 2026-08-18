// ============================================
// SECTORES - CON EMOJIS PARA MEJOR VISUALIZACIÓN
// ============================================

// Variables globales de sectores
let sectorMarkers = {};
let sectorPolygons = {};
let activeSectorId = null;
let sectorModalActivo = null;
let sectoresVisibles = true;

// Capas para sectores
let sectorPolygonLayer = null;
let sectorMarkerLayer = null;

// ============================================
// FUNCIÓN PARA INICIALIZAR SECTORES
// ============================================
async function inicializarSectores() {
    console.log('🏘️ Inicializando sistema de sectores con emojis...');
    
    // Cargar datos usando el gestor
    await gestorSectores.cargarDatos();
    
    const sectores = gestorSectores.getTodosSectores();
    console.log(`📊 ${Object.keys(sectores).length} sectores disponibles`);
    
    // Crear capas
    crearCapasSectores();
    
    // Crear marcadores y polígonos para cada sector
    Object.keys(sectores).forEach(sectorId => {
        const sector = sectores[sectorId];
        crearFeatureSector(sectorId, sector);
    });
    
    // Configurar eventos
    configurarEventosSectores();
    
    // Configurar callback para cambios en los datos
    gestorSectores.onCambio(() => {
        console.log('🔄 Datos de sectores actualizados, refrescando mapa...');
        refrescarSectores();
    });
    
    console.log('✅ Sistema de sectores inicializado correctamente');
}

// ============================================
// CREAR CAPAS DE SECTORES
// ============================================
function crearCapasSectores() {
    // Capa para polígonos - OCULTA POR DEFECTO
    sectorPolygonLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const isActive = feature.get('active') || false;
            const color = feature.get('color') || '#F5DEB3';
            return crearEstiloPoligonoSector(isActive, color);
        },
        visible: false
    });
    map.addLayer(sectorPolygonLayer);
    
    // Capa para marcadores - CON EMOJI
    sectorMarkerLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const sectorId = feature.get('sectorId');
            const isActive = feature.get('active') || false;
            const color = feature.get('color') || '#F5DEB3';
            return crearEstiloMarcadorSector(sectorId, isActive, color);
        },
        updateWhileAnimating: true,
        updateWhileInteracting: true
    });
    map.addLayer(sectorMarkerLayer);
}

// ============================================
// CREAR FEATURE DE SECTOR
// ============================================
function crearFeatureSector(sectorId, sector) {
    if (!sector.area || sector.area.length < 3) {
        console.warn(`⚠️ Sector ${sectorId} sin área válida`);
        return;
    }
    
    // Crear polígono
    const polygonCoords = sector.area.map(coord => ol.proj.fromLonLat(coord));
    const polygon = new ol.geom.Polygon([polygonCoords]);
    
    const polygonFeature = new ol.Feature({
        geometry: polygon,
        sectorId: sectorId,
        active: false,
        color: sector.color || '#F5DEB3'
    });
    sectorPolygonLayer.getSource().addFeature(polygonFeature);
    sectorPolygons[sectorId] = polygonFeature;
    
    // Crear marcador
    const markerCoords = sector.coords ? 
        ol.proj.fromLonLat(sector.coords) : 
        calcularCentroPoligono(polygonCoords);
    
    const markerFeature = new ol.Feature({
        geometry: new ol.geom.Point(markerCoords),
        sectorId: sectorId,
        active: false,
        color: sector.color || '#F5DEB3',
        sectorData: sector
    });
    
    sectorMarkerLayer.getSource().addFeature(markerFeature);
    sectorMarkers[sectorId] = markerFeature;
}

// ============================================
// ESTILOS DE SECTORES
// ============================================
function crearEstiloPoligonoSector(active = false, color = '#F5DEB3') {
    return new ol.style.Style({
        fill: new ol.style.Fill({
            color: active ? hexToRgba(color, 0.35) : hexToRgba(color, 0.15)
        }),
        stroke: new ol.style.Stroke({
            color: active ? darkenHex(color, 30) : color,
            width: active ? 3 : 2,
            lineDash: active ? [] : [5, 5]
        })
    });
}

// ============================================
// ESTILO CON EMOJI + NÚMERO
// ============================================
function crearEstiloMarcadorSector(sectorId, active = false, color = '#F5DEB3') {
    // Colores según estado
    const textColor = active ? '#FFFFFF' : '#333333';
    const bgColor = active ? darkenHex(color, 30) : 'transparent';
    
    // Tamaño de fuente adaptativo según zoom
    const zoom = map.getView().getZoom();
    let emojiSize = 24;
    let numberSize = 11;
    let padding = 4;
    
    if (zoom >= 18) {
        emojiSize = 32;
        numberSize = 14;
        padding = 6;
    } else if (zoom >= 16) {
        emojiSize = 28;
        numberSize = 12;
        padding = 5;
    } else if (zoom >= 14) {
        emojiSize = 22;
        numberSize = 10;
        padding = 4;
    } else if (zoom >= 12) {
        emojiSize = 18;
        numberSize = 8;
        padding = 3;
    } else {
        emojiSize = 14;
        numberSize = 7;
        padding = 2;
    }
    
    // Para sectores con IDs largos (como "43 A"), reducir tamaño
    const isLongId = sectorId.length > 3;
    if (isLongId) {
        numberSize = Math.max(numberSize - 2, 6);
    }
    
    // Crear el texto combinado: EMOJI + NÚMERO
    // El emoji va arriba y el número abajo (en una sola línea con espacio)
    const displayText = `🏘️ ${sectorId}`;
    
    // O si prefieres el emoji SOLO sin número:
    // const displayText = '🏘️';
    
    // O si prefieres el número arriba y emoji abajo:
    // const displayText = `${sectorId}\n🏘️`;
    
    return new ol.style.Style({
        text: new ol.style.Text({
            text: displayText,
            font: `${numberSize}px "Segoe UI", Arial, sans-serif`,
            fill: new ol.style.Fill({
                color: textColor
            }),
            stroke: new ol.style.Stroke({
                color: active ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.9)',
                width: active ? 3 : 2
            }),
            textAlign: 'center',
            textBaseline: 'middle',
            offsetY: 0,
            backgroundFill: new ol.style.Fill({
                color: bgColor
            }),
            backgroundStroke: new ol.style.Stroke({
                color: active ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)',
                width: 2
            }),
            padding: [padding, padding + 4, padding, padding + 4]
        })
    });
}

// ============================================
// FUNCIONES DE UTILIDAD PARA COLORES
// ============================================
function hexToRgba(hex, alpha = 1) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(245, 222, 179, ${alpha})`;
    
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function darkenHex(hex, amount = 20) {
    let c = hex.replace('#', '');
    if (c.length === 3) {
        c = c.split('').map(char => char + char).join('');
    }
    
    let r = parseInt(c.substring(0, 2), 16);
    let g = parseInt(c.substring(2, 4), 16);
    let b = parseInt(c.substring(4, 6), 16);
    
    r = Math.max(0, r - amount);
    g = Math.max(0, g - amount);
    b = Math.max(0, b - amount);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ============================================
// CALCULAR CENTRO DE POLÍGONO
// ============================================
function calcularCentroPoligono(coords) {
    let x = 0, y = 0;
    coords.forEach(coord => {
        x += coord[0];
        y += coord[1];
    });
    return [x / coords.length, y / coords.length];
}

// ============================================
// REFRESCAR SECTORES (CUANDO CAMBIAN DATOS)
// ============================================
function refrescarSectores() {
    // Limpiar capas
    sectorPolygonLayer.getSource().clear();
    sectorMarkerLayer.getSource().clear();
    
    // Limpiar referencias
    sectorPolygons = {};
    sectorMarkers = {};
    
    // Volver a crear features
    const sectores = gestorSectores.getTodosSectores();
    Object.keys(sectores).forEach(sectorId => {
        crearFeatureSector(sectorId, sectores[sectorId]);
    });
    
    // Si había un sector activo, reactivarlo
    if (activeSectorId) {
        const sector = gestorSectores.getSector(activeSectorId);
        if (sector) {
            activarSector(activeSectorId);
        } else {
            activeSectorId = null;
        }
    }
}

// ============================================
// ACTIVAR SECTOR
// ============================================
function activarSector(sectorId, mostrarPoligono = false) {
    console.log(`📍 Activando sector: ${sectorId}`);
    
    const sector = gestorSectores.getSector(sectorId);
    if (!sector) {
        console.warn(`⚠️ Sector ${sectorId} no encontrado`);
        return;
    }
    
    // Desactivar sector anterior
    if (activeSectorId !== null) {
        const prevPolygon = sectorPolygons[activeSectorId];
        if (prevPolygon) {
            prevPolygon.set('active', false);
            prevPolygon.changed();
        }
        const prevMarker = sectorMarkers[activeSectorId];
        if (prevMarker) {
            prevMarker.set('active', false);
            prevMarker.changed();
        }
    }
    
    // Activar nuevo sector
    const polygon = sectorPolygons[sectorId];
    if (polygon) {
        polygon.set('active', true);
        polygon.changed();
    }
    
    const marker = sectorMarkers[sectorId];
    if (marker) {
        marker.set('active', true);
        marker.changed();
    }
    
    activeSectorId = sectorId;
    
    // Mostrar polígono SOLO si se solicita
    if (mostrarPoligono && sectorPolygonLayer) {
        sectorPolygonLayer.setVisible(true);
        // Centrar el mapa en el sector
        if (sector.area && sector.area.length > 0) {
            const coords = sector.area.map(c => ol.proj.fromLonLat(c));
            const center = calcularCentroPoligono(coords);
            map.getView().animate({
                center: center,
                zoom: 17,
                duration: 800
            });
        }
    } else {
        // Ocultar polígono si no se solicita
        if (sectorPolygonLayer) {
            sectorPolygonLayer.setVisible(false);
        }
    }
}

// ============================================
// DESACTIVAR SECTOR
// ============================================
function desactivarSector() {
    if (activeSectorId !== null) {
        const polygon = sectorPolygons[activeSectorId];
        if (polygon) {
            polygon.set('active', false);
            polygon.changed();
        }
        const marker = sectorMarkers[activeSectorId];
        if (marker) {
            marker.set('active', false);
            marker.changed();
        }
        activeSectorId = null;
    }
}

// ============================================
// MOSTRAR/OCULTAR SECTORES
// ============================================
function toggleSectores() {
    sectoresVisibles = !sectoresVisibles;
    sectorMarkerLayer.setVisible(sectoresVisibles);
    // Los polígonos solo se muestran cuando se traza ruta
    if (!sectoresVisibles && sectorPolygonLayer) {
        sectorPolygonLayer.setVisible(false);
    }
    
    const btn = document.getElementById('toggleSectoresBtn');
    if (sectoresVisibles) {
        btn.classList.remove('oculto');
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M3 3h18v2H3V3zm0 16h18v2H3v-2zm0-8h18v2H3v-2z"/>
            </svg>
            Sectores
        `;
    } else {
        btn.classList.add('oculto');
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M3 3h18v2H3V3zm0 16h18v2H3v-2zm0-8h18v2H3v-2z"/>
            </svg>
            Mostrar
        `;
    }
}

// ============================================
// MODAL DE SECTOR
// ============================================
function abrirModalSector(sectorId) {
    const sector = gestorSectores.getSector(sectorId);
    if (!sector) return;
    
    sectorModalActivo = sectorId;
    
    // Actualizar título
    document.getElementById('sectorModalTitle').textContent = sector.name || `Sector ${sectorId}`;
    
    // Actualizar total de casas
    document.getElementById('sectorTotalCasas').textContent = sector.n_casas || 0;
    
    // Limpiar input de casa
    const houseInput = document.getElementById('sectorHouseInput');
    if (houseInput) houseInput.value = '';
    
    // Mostrar modal
    document.getElementById('sectorModal').classList.add('active');
}

function cerrarModalSector() {
    document.getElementById('sectorModal').classList.remove('active');
    sectorModalActivo = null;
}
// ============================================
// TRAZAR RUTA
// ============================================
function trazarRutaASector(sectorId) {
    console.log('🧭 === INICIANDO TRAZADO DE RUTA ===');
    console.log(`📍 Sector destino: ${sectorId}`);
    
    const sector = gestorSectores.getSector(sectorId);
    if (!sector) {
        console.warn(`⚠️ Sector ${sectorId} no encontrado`);
        alert(`El sector ${sectorId} no existe.`);
        return;
    }
    
    if (!currentPosition) {
        console.warn('⚠️ No hay posición actual');
        alert('⚠️ Esperando ubicación actual...');
        return;
    }
    
    console.log(`📍 Ubicación actual: ${currentPosition.lat}, ${currentPosition.lon}`);
    console.log(`📍 Coordenadas del sector:`, sector.coords || sector.area[0]);
    
    // Activar sector Y mostrar polígono
    activarSector(sectorId, true);
    
    // Coordenadas de origen y destino
    const origen = [currentPosition.lon, currentPosition.lat];
    const destino = sector.coords || sector.area[0];
    
    console.log(`📍 Origen: [${origen.join(', ')}]`);
    console.log(`📍 Destino: [${destino.join(', ')}]`);
    
    // Mostrar indicador de carga
    mostrarIndicadorCarga('Calculando ruta...');
    
    // Calcular la ruta usando el gestor
    gestorRutas.calcularRuta(origen, destino)
        .then(() => {
            console.log('✅ Ruta calculada exitosamente');
            ocultarIndicadorCarga();
            
            // Iniciar seguimiento en tiempo real
            gestorRutas.iniciarSeguimiento(3000);
            
            // Mostrar panel de instrucciones
            mostrarPanelInstrucciones(sectorId);
            
            // Reproducir sonido de inicio de ruta (opcional)
            reproducirSonidoRuta();
        })
        .catch((error) => {
            console.error('❌ Error al trazar ruta:', error);
            ocultarIndicadorCarga();
            alert('No se pudo calcular la ruta. Intenta de nuevo.\n\nError: ' + error.message);
        });
}


// ============================================
// MOSTRAR INDICADOR DE CARGA
// ============================================
function mostrarIndicadorCarga(mensaje) {
    let loader = document.getElementById('routeLoader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'routeLoader';
        loader.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.85);
            color: white;
            padding: 30px 40px;
            border-radius: 16px;
            z-index: 10000;
            text-align: center;
            min-width: 200px;
            backdrop-filter: blur(10px);
        `;
        loader.innerHTML = `
            <div style="display:inline-block;width:40px;height:40px;border:4px solid rgba(255,255,255,0.1);border-radius:50%;border-top-color:#4285F4;animation:spin 0.8s linear infinite;margin-bottom:12px;"></div>
            <p style="margin:0;font-size:16px;font-family:Arial,sans-serif;" id="loaderText">Calculando...</p>
        `;
        document.body.appendChild(loader);
        
        if (!document.getElementById('spinStyle')) {
            const style = document.createElement('style');
            style.id = 'spinStyle';
            style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
            document.head.appendChild(style);
        }
    }
    
    const textEl = loader.querySelector('#loaderText');
    if (textEl) textEl.textContent = mensaje || 'Calculando...';
    loader.style.display = 'block';
}

function ocultarIndicadorCarga() {
    const loader = document.getElementById('routeLoader');
    if (loader) loader.style.display = 'none';
}
// ============================================
// MOSTRAR PANEL DE INSTRUCCIONES
// ============================================
function mostrarPanelInstrucciones(sectorId) {
    // Eliminar panel anterior si existe
    const panelAnterior = document.getElementById('routePanel');
    if (panelAnterior) panelAnterior.remove();
    
    const panel = document.createElement('div');
    panel.id = 'routePanel';
    panel.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        padding: 16px 24px;
        z-index: 9999;
        max-width: 90%;
        min-width: 280px;
        font-family: Arial, sans-serif;
        animation: slideUp 0.3s ease;
        border: 2px solid #4285F4;
    `;
    
    panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-size:14px;color:#666;">Ruta al Sector ${sectorId}</span>
            <button id="cancelRouteBtn" style="background:none;border:none;font-size:20px;cursor:pointer;color:#999;">×</button>
        </div>
        <div id="routeInstructions" style="font-size:15px;color:#333;padding:4px 0;">
            <span style="color:#4285F4;">●</span> Cargando instrucciones...
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:12px;color:#888;">
            <span id="routeDistance">Distancia: 0 m</span>
            <span id="routeTime">Tiempo: 0 min</span>
        </div>
        <div style="margin-top:8px;height:3px;background:#e0e0e0;border-radius:3px;overflow:hidden;">
            <div id="routeProgress" style="height:100%;width:0%;background:linear-gradient(90deg,#4285F4,#34A853);transition:width 0.5s;"></div>
        </div>
    `;
    
    document.body.appendChild(panel);
    
    // Evento para cancelar ruta
    document.getElementById('cancelRouteBtn').addEventListener('click', () => {
        gestorRutas.cancelarRuta();
        panel.remove();
    });
    
    // Configurar listener para actualizaciones de ruta
    gestorRutas.on('onRutaActualizada', (data) => {
        const inst = gestorRutas.getInstruccionActual();
        const instruccionText = inst ? inst.instruccion : 'Continuar...';
        
        const instrEl = document.getElementById('routeInstructions');
        if (instrEl) {
            instrEl.innerHTML = `<span style="color:#4285F4;">●</span> ${instruccionText}`;
        }
        
        const distEl = document.getElementById('routeDistance');
        if (distEl) {
            const distRestante = data.distanciaRestante || 0;
            distEl.textContent = `Distancia: ${Math.round(distRestante)} m`;
        }
        
        const timeEl = document.getElementById('routeTime');
        if (timeEl) {
            const timeRestante = data.tiempoRestante || 0;
            const minutos = Math.floor(timeRestante / 60);
            const segundos = Math.floor(timeRestante % 60);
            timeEl.textContent = `Tiempo: ${minutos}:${segundos.toString().padStart(2, '0')}`;
        }
        
        // Actualizar progreso
        const progressEl = document.getElementById('routeProgress');
        if (progressEl && gestorRutas.distanciaTotal > 0) {
            const progress = ((gestorRutas.distanciaTotal - (data.distanciaRestante || 0)) / gestorRutas.distanciaTotal) * 100;
            progressEl.style.width = `${Math.min(100, progress)}%`;
        }
    });
    
    // Actualizar información inicial
    setTimeout(() => {
        const distEl = document.getElementById('routeDistance');
        if (distEl && gestorRutas.distanciaTotal) {
            distEl.textContent = `Distancia: ${Math.round(gestorRutas.distanciaTotal)} m`;
        }
        
        const timeEl = document.getElementById('routeTime');
        if (timeEl && gestorRutas.tiempoTotal) {
            const minutos = Math.floor(gestorRutas.tiempoTotal / 60);
            const segundos = Math.floor(gestorRutas.tiempoTotal % 60);
            timeEl.textContent = `Tiempo: ${minutos}:${segundos.toString().padStart(2, '0')}`;
        }
    }, 500);
    
    // Agregar animación slideUp si no existe
    if (!document.getElementById('slideUpStyle')) {
        const style = document.createElement('style');
        style.id = 'slideUpStyle';
        style.textContent = '@keyframes slideUp { from { transform: translate(-50%, 20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }';
        document.head.appendChild(style);
    }
}

// ============================================
// REPRODUCIR SONIDO DE RUTA (OPCIONAL)
// ============================================
function reproducirSonidoRuta() {
    try {
        const audio = new Audio();
        audio.volume = 0.3;
        
        // Crear un sonido simple usando Web Audio API
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        
        oscillator.frequency.value = 880;
        oscillator.type = 'sine';
        
        gain.gain.value = 0.1;
        
        oscillator.start();
        setTimeout(() => {
            oscillator.frequency.value = 1100;
        }, 100);
        setTimeout(() => {
            oscillator.stop();
        }, 300);
    } catch (e) {
        // Silenciar errores de audio
    }
}


// ============================================
// CONFIGURAR EVENTOS 
// ============================================
function configurarEventosSectores() {
    console.log('🔧 Configurando eventos de sectores...');
    
    // === Evento de click en el mapa ===
    map.on('click', function(evt) {
        const features = map.getFeaturesAtPixel(evt.pixel, {
            hitTolerance: 15,
            layers: [sectorMarkerLayer]
        });
        
        if (features && features.length > 0) {
            const feature = features[0];
            const sectorId = feature.get('sectorId');
            
            if (sectorId) {
                console.log(`✅ Click en sector: ${sectorId}`);
                activarSector(sectorId, false);
                abrirModalSector(sectorId);
            }
        }
    });
    
    // === Hover para cambiar cursor ===
    map.on('pointermove', function(evt) {
        const pixel = map.getEventPixel(evt.originalEvent);
        const hit = map.hasFeatureAtPixel(pixel, {
            hitTolerance: 15,
            layers: [sectorMarkerLayer]
        });
        
        const targetId = map.getTarget();
        const targetElement = typeof targetId === 'string' ? document.getElementById(targetId) : targetId;
        
        if (targetElement) {
            targetElement.style.cursor = hit ? 'pointer' : 'default';
        }
    });
    
    // === Eventos del modal ===
    const modalClose = document.getElementById('sectorModalClose');
    if (modalClose) {
        modalClose.addEventListener('click', cerrarModalSector);
    }
    
    const modal = document.getElementById('sectorModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                cerrarModalSector();
            }
        });
    }
    
    // === Botón de ruta - VERSIÓN CORREGIDA ===
    const rutaBtn = document.getElementById('sectorRutaBtn');
    if (rutaBtn) {
        // Eliminar eventos anteriores clonando el botón
        const newRutaBtn = rutaBtn.cloneNode(true);
        rutaBtn.parentNode.replaceChild(newRutaBtn, rutaBtn);
        
        newRutaBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('🔘 Botón "Trazar ruta" clickeado');
            
            // ✅ GUARDAR EL SECTOR ID ANTES DE CERRAR EL MODAL
            const sectorId = sectorModalActivo;
            
            if (!sectorId) {
                console.warn('⚠️ No hay sector activo');
                alert('Por favor, selecciona un sector primero.');
                return;
            }
            
            if (!currentPosition) {
                alert('⚠️ Esperando ubicación actual...');
                return;
            }
            
            // Obtener número de casa (opcional)
            const houseInput = document.getElementById('sectorHouseInput');
            const houseNumber = houseInput ? houseInput.value.trim() : '';
            
            if (houseNumber) {
                console.log(`🏠 Casa #${houseNumber} en sector ${sectorId}`);
            }
            
            // Cerrar modal
            cerrarModalSector();
            
            // Trazar la ruta con el sectorId guardado
            console.log(`📍 Trazando ruta al sector: ${sectorId}`);
            setTimeout(() => {
                trazarRutaASector(sectorId);
            }, 300);
        });
    }
    
    // === Botón toggle sectores ===
    const toggleBtn = document.getElementById('toggleSectoresBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleSectores);
    }
    
    // === Actualizar estilos al hacer zoom ===
    map.getView().on('change:resolution', function() {
        if (sectorMarkerLayer) {
            sectorMarkerLayer.changed();
        }
    });
    
    console.log('✅ Eventos de sectores configurados correctamente');
}
// ============================================
// INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        inicializarSectores();
    }, 500);
});