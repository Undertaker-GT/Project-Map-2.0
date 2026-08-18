// ============================================
// SALONES DE EVENTOS - VERSIÓN CON OSRM
// ============================================

// Variables globales
let salonesMarkers = {};
let salonesPolygons = {};
let activeSalonId = null;
let salonesVisibles = true;

// Capas para salones
let salonPolygonLayer = null;
let salonMarkerLayer = null;

// ============================================
// INICIALIZAR SALONES DE EVENTOS
// ============================================
async function inicializarSalonesEventos() {
    console.log('🏡 Inicializando sistema de salones de eventos (modo optimizado)...');
    
    await gestorSalonesEventos.cargarDatos();
    
    const salones = gestorSalonesEventos.getTodosSalones();
    console.log(`📊 ${Object.keys(salones).length} salones disponibles`);
    
    crearCapasSalones();
    
    Object.keys(salones).forEach(salonId => {
        const salon = salones[salonId];
        crearFeatureSalon(salonId, salon);
    });
    
    configurarEventosSalones();
    
    gestorSalonesEventos.onCambio(() => {
        console.log('🔄 Datos de salones actualizados, refrescando...');
        refrescarSalones();
    });
    
    console.log('✅ Sistema de salones inicializado correctamente');
}

// ============================================
// CREAR CAPAS DE SALONES
// ============================================
function crearCapasSalones() {
    // Capa para polígonos - OCULTA POR DEFECTO
    salonPolygonLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const isActive = feature.get('active') || false;
            const color = feature.get('color') || '#FF6B35';
            return crearEstiloPoligonoSalon(isActive, color);
        },
        visible: false
    });
    map.addLayer(salonPolygonLayer);
    
    // Capa para marcadores - SOLO EMOJI (sin círculo)
    salonMarkerLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const salonId = feature.get('salonId');
            const isActive = feature.get('active') || false;
            const color = feature.get('color') || '#FF6B35';
            const emoji = feature.get('emoji') || '🏡';
            const salonData = feature.get('salonData');
            return crearEstiloMarcadorSalon(salonId, isActive, color, emoji, salonData);
        },
        updateWhileAnimating: true,
        updateWhileInteracting: true
    });
    map.addLayer(salonMarkerLayer);
}

// ============================================
// CREAR FEATURE DE SALÓN
// ============================================
function crearFeatureSalon(salonId, salon) {
    if (!salon.area || salon.area.length < 3) {
        console.warn(`⚠️ Salón ${salonId} sin área válida`);
        return;
    }
    
    try {
        // Crear polígono
        const polygonCoords = salon.area.map(coord => ol.proj.fromLonLat(coord));
        const polygon = new ol.geom.Polygon([polygonCoords]);
        
        const polygonFeature = new ol.Feature({
            geometry: polygon,
            salonId: salonId,
            active: false,
            color: salon.color || '#FF6B35'
        });
        salonPolygonLayer.getSource().addFeature(polygonFeature);
        salonesPolygons[salonId] = polygonFeature;
        
        // Crear marcador
        const markerCoords = salon.iconCoords ? 
            ol.proj.fromLonLat(salon.iconCoords) : 
            ol.proj.fromLonLat(salon.coords);
        
        const markerFeature = new ol.Feature({
            geometry: new ol.geom.Point(markerCoords),
            salonId: salonId,
            active: false,
            color: salon.color || '#FF6B35',
            emoji: salon.emoji || '🏡',
            salonData: salon
        });
        
        salonMarkerLayer.getSource().addFeature(markerFeature);
        salonesMarkers[salonId] = markerFeature;
        
        console.log(`✅ Salón ${salonId} creado correctamente`);
    } catch (error) {
        console.error(`❌ Error creando salón ${salonId}:`, error);
    }
}

// ============================================
// ESTILOS DE SALONES
// ============================================
function crearEstiloPoligonoSalon(active = false, color = '#FF6B35') {
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

function crearEstiloMarcadorSalon(salonId, active = false, color = '#FF6B35', emoji = '🏡', salonData = null) {
    const textColor = active ? '#FFFFFF' : '#333333';
    const bgColor = active ? darkenHex(color, 30) : 'transparent';
    
    const zoom = map.getView().getZoom();
    let nameSize = 10;
    let padding = 3;
    
    if (zoom >= 18) {
        nameSize = 13;
        padding = 6;
    } else if (zoom >= 16) {
        nameSize = 11;
        padding = 5;
    } else if (zoom >= 14) {
        nameSize = 9;
        padding = 4;
    } else if (zoom >= 12) {
        nameSize = 8;
        padding = 3;
    } else {
        nameSize = 7;
        padding = 2;
    }
    
    let nombreMostrar = salonId;
    if (salonData && salonData.nombre) {
        nombreMostrar = salonData.nombre.length > 12 ? 
            salonData.nombre.substring(0, 10) + '…' : 
            salonData.nombre;
    }
    
    const displayText = `${emoji}\n${nombreMostrar}`;
    
    return new ol.style.Style({
        text: new ol.style.Text({
            text: displayText,
            font: `${nameSize}px "Segoe UI", Arial, sans-serif`,
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
// FUNCIONES DE UTILIDAD
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

function calcularCentroPoligono(coords) {
    let x = 0, y = 0;
    coords.forEach(coord => {
        x += coord[0];
        y += coord[1];
    });
    return [x / coords.length, y / coords.length];
}

// ============================================
// CERRAR MODAL DE SALÓN
// ============================================
function cerrarModalSalon() {
    const modal = document.getElementById('salonModal');
    if (modal) {
        modal.classList.remove('active');
    }
    activeSalonId = null;
}

// ============================================
// ABRIR MODAL DE SALÓN
// ============================================
function abrirModalSalon(salonId) {
    const salon = gestorSalonesEventos.getSalon(salonId);
    if (!salon) {
        console.warn(`⚠️ Salón ${salonId} no encontrado`);
        return;
    }
    
    activeSalonId = salonId;
    
    const titulo = document.getElementById('salonTitulo');
    if (titulo) {
        titulo.textContent = salon.emoji + ' ' + (salon.nombre || 'Salón de Eventos');
    }
    
    const lista = document.getElementById('listaSalones');
    if (!lista) return;
    
    lista.innerHTML = '';
    
    const fotosHTML = salon.fotos && salon.fotos.length > 0 ?
        salon.fotos.map(f => `<img src="${f}" alt="${salon.nombre}" onerror="this.style.display='none'">`).join('') :
        '<p style="color:#94a3b8;font-size:13px;padding:8px;">Sin imágenes disponibles</p>';
    
    const item = document.createElement('div');
    item.className = 'salon-card';
    item.innerHTML = `
        <div class="salon-carousel">
            ${fotosHTML}
        </div>
        <div class="salon-info">
            <div class="salon-detalles">
                <span class="salon-tipo">${salon.tipo || 'Salón de Eventos'}</span>
                ${salon.capacidad ? `<p class="salon-capacidad">👥 Capacidad: ${salon.capacidad} personas</p>` : ''}
                ${salon.direccion ? `<p class="salon-dir">📍 ${salon.direccion}</p>` : ''}
            </div>
            <button class="salon-btn" onclick="trazarRutaSalon('${salonId}')">
                <i class="fas fa-route"></i> Trazar ruta
            </button>
        </div>
    `;
    lista.appendChild(item);
    
    document.getElementById('salonModal').classList.add('active');
}

// ============================================
// ACTIVAR SALÓN
// ============================================
function activarSalon(salonId, mostrarPoligono = false) {
    // Desactivar salón anterior
    if (activeSalonId !== null) {
        const prevPolygon = salonesPolygons[activeSalonId];
        if (prevPolygon) {
            prevPolygon.set('active', false);
            prevPolygon.changed();
        }
        const prevMarker = salonesMarkers[activeSalonId];
        if (prevMarker) {
            prevMarker.set('active', false);
            prevMarker.changed();
        }
    }
    
    // Activar nuevo salón
    const polygon = salonesPolygons[salonId];
    if (polygon) {
        polygon.set('active', true);
        polygon.changed();
    }
    
    const marker = salonesMarkers[salonId];
    if (marker) {
        marker.set('active', true);
        marker.changed();
    }
    
    activeSalonId = salonId;
    
    // Centrar el mapa en el salón (solo si se muestra el polígono)
    if (mostrarPoligono) {
        const salon = gestorSalonesEventos.getSalon(salonId);
        if (salon && salon.area && salon.area.length > 0) {
            const coords = salon.area.map(c => ol.proj.fromLonLat(c));
            const center = calcularCentroPoligono(coords);
            map.getView().animate({
                center: center,
                zoom: 17,
                duration: 800
            });
        }
    }

    if (mostrarPoligono && salonPolygonLayer) {
        salonPolygonLayer.setVisible(true);
    } else {
        if (salonPolygonLayer) {
            salonPolygonLayer.setVisible(false);
        }
    }
}

// ============================================
// RUTA AL SALÓN - CON OSRM
// ============================================
function trazarRutaSalon(salonId) {
    const salon = gestorSalonesEventos.getSalon(salonId);
    if (!salon) {
        console.warn(`⚠️ Salón ${salonId} no encontrado`);
        return;
    }
    
    if (!currentPosition) {
        alert('⚠️ Esperando ubicación actual...');
        return;
    }
    
    cerrarModalSalon();
    
    console.log(`🧭 Trazando ruta a ${salon.nombre}`);
    console.log(`📍 Ubicación actual: ${currentPosition.lat}, ${currentPosition.lon}`);
    
    activarSalon(salonId, true);
    
    const origen = [currentPosition.lon, currentPosition.lat];
    const destino = salon.coords || salon.area[0];
    
    console.log(`📍 Origen: [${origen.join(', ')}]`);
    console.log(`📍 Destino: [${destino.join(', ')}]`);
    
    mostrarIndicadorCarga('Calculando ruta al salón de eventos...');
    
    gestorRutas.calcularRuta(origen, destino)
        .then(() => {
            console.log('✅ Ruta calculada exitosamente');
            ocultarIndicadorCarga();
            gestorRutas.iniciarSeguimiento(3000);
            mostrarPanelInstruccionesSalon(salonId);
            reproducirSonidoRuta();
        })
        .catch((error) => {
            console.error('❌ Error al trazar ruta:', error);
            ocultarIndicadorCarga();
            alert('No se pudo calcular la ruta. Intenta de nuevo.\n\nError: ' + error.message);
        });
}

// ============================================
// MOSTRAR PANEL DE INSTRUCCIONES PARA SALÓN
// ============================================
function mostrarPanelInstruccionesSalon(salonId) {
    const salon = gestorSalonesEventos.getSalon(salonId);
    if (!salon) return;
    
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
        border: 2px solid #FF6B35;
    `;
    
    const emoji = salon.emoji || '🏡';
    const nombre = salon.nombre || 'Salón de Eventos';
    const tipo = salon.tipo || 'Salón de Eventos';
    
    panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-size:14px;color:#666;">${emoji} ${nombre}</span>
            <button id="cancelRouteBtn" style="background:none;border:none;font-size:20px;cursor:pointer;color:#999;">×</button>
        </div>
        <div id="routeInstructions" style="font-size:15px;color:#333;padding:4px 0;">
            <span style="color:#FF6B35;">●</span> Cargando instrucciones...
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:12px;color:#888;">
            <span id="routeDistance">Distancia: 0 m</span>
            <span id="routeTime">Tiempo: 0 min</span>
        </div>
        <div style="margin-top:8px;height:3px;background:#e0e0e0;border-radius:3px;overflow:hidden;">
            <div id="routeProgress" style="height:100%;width:0%;background:linear-gradient(90deg,#FF6B35,#FF8F5E);transition:width 0.5s;"></div>
        </div>
        <div style="margin-top:6px;font-size:11px;color:#999;text-align:center;">
            🎉 ${tipo} ${salon.capacidad ? `| 👥 ${salon.capacidad} personas` : ''}
        </div>
    `;
    
    document.body.appendChild(panel);
    
    document.getElementById('cancelRouteBtn').addEventListener('click', () => {
        gestorRutas.cancelarRuta();
        panel.remove();
        if (salonPolygonLayer) {
            salonPolygonLayer.setVisible(false);
        }
        if (activeSalonId !== null) {
            const prevMarker = salonesMarkers[activeSalonId];
            if (prevMarker) {
                prevMarker.set('active', false);
                prevMarker.changed();
            }
            activeSalonId = null;
        }
    });
    
    gestorRutas.on('onRutaActualizada', (data) => {
        const inst = gestorRutas.getInstruccionActual();
        const instruccionText = inst ? inst.instruccion : 'Continuar...';
        
        const instrEl = document.getElementById('routeInstructions');
        if (instrEl) {
            instrEl.innerHTML = `<span style="color:#FF6B35;">●</span> ${instruccionText}`;
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
        
        const progressEl = document.getElementById('routeProgress');
        if (progressEl && gestorRutas.distanciaTotal > 0) {
            const progress = ((gestorRutas.distanciaTotal - (data.distanciaRestante || 0)) / gestorRutas.distanciaTotal) * 100;
            progressEl.style.width = `${Math.min(100, progress)}%`;
        }
    });
    
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
}

// ============================================
// FUNCIONES AUXILIARES COMPARTIDAS
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
            <div style="display:inline-block;width:40px;height:40px;border:4px solid rgba(255,255,255,0.1);border-radius:50%;border-top-color:#FF6B35;animation:spin 0.8s linear infinite;margin-bottom:12px;"></div>
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

function reproducirSonidoRuta() {
    try {
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
// REFRESCAR SALONES
// ============================================
function refrescarSalones() {
    if (salonPolygonLayer) {
        salonPolygonLayer.getSource().clear();
    }
    if (salonMarkerLayer) {
        salonMarkerLayer.getSource().clear();
    }
    salonesPolygons = {};
    salonesMarkers = {};
    
    const salones = gestorSalonesEventos.getTodosSalones();
    Object.keys(salones).forEach(salonId => {
        crearFeatureSalon(salonId, salones[salonId]);
    });
}

// ============================================
// MOSTRAR/OCULTAR SALONES
// ============================================
function toggleSalones() {
    salonesVisibles = !salonesVisibles;
    
    if (salonPolygonLayer) {
        salonPolygonLayer.setVisible(salonesVisibles);
    }
    if (salonMarkerLayer) {
        salonMarkerLayer.setVisible(salonesVisibles);
    }
    
    const btn = document.getElementById('toggleSalonesBtn');
    if (btn) {
        if (salonesVisibles) {
            btn.classList.remove('oculto');
            btn.innerHTML = `
                <i class="fas fa-calendar-alt"></i>
                Salón de eventos
            `;
            btn.title = 'Ocultar salón de eventos';
        } else {
            btn.classList.add('oculto');
            btn.innerHTML = `
                <i class="fas fa-calendar-alt"></i>
                Mostrar Salón de eventos
            `;
            btn.title = 'Mostrar salón de eventos';
        }
    }
    
    console.log(`🏡 Salones ${salonesVisibles ? 'visible' : 'oculto'}`);
}

// ============================================
// CONFIGURAR EVENTOS
// ============================================
function configurarEventosSalones() {
    // Click en marcadores de salones
    map.on('click', function(evt) {
        const features = map.getFeaturesAtPixel(evt.pixel, {
            hitTolerance: 15,
            layers: [salonMarkerLayer]
        });
        
        if (features && features.length > 0) {
            const feature = features[0];
            const salonId = feature.get('salonId');
            if (salonId) {
                console.log(`🏡 Click en salón: ${salonId}`);
                activarSalon(salonId);
                abrirModalSalon(salonId);
            }
        }
    });
    
    // Hover para cambiar cursor
    map.on('pointermove', function(evt) {
        const pixel = map.getEventPixel(evt.originalEvent);
        const hit = map.hasFeatureAtPixel(pixel, {
            hitTolerance: 15,
            layers: [salonMarkerLayer]
        });
        
        const targetId = map.getTarget();
        const targetElement = typeof targetId === 'string' ? document.getElementById(targetId) : targetId;
        if (targetElement) {
            targetElement.style.cursor = hit ? 'pointer' : 'default';
        }
    });
    
    // === EVENTOS DEL MODAL DE SALONES ===
    const closeBtn = document.getElementById('salonModalClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', cerrarModalSalon);
    }
    
    const modal = document.getElementById('salonModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                cerrarModalSalon();
            }
        });
    }
    
    // Cerrar con tecla ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('salonModal');
            if (modal && modal.classList.contains('active')) {
                cerrarModalSalon();
            }
        }
    });
    
    // Botón toggle salones
    const toggleBtn = document.getElementById('toggleSalonesBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleSalones);
    }
    
    // === Actualizar estilos al hacer zoom ===
    map.getView().on('change:resolution', function() {
        if (salonMarkerLayer) {
            salonMarkerLayer.changed();
        }
    });
    
    console.log('✅ Eventos de salones configurados correctamente');
}

// ============================================
// INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        inicializarSalonesEventos();
    }, 1200);
});