// Inicializar el mapa
const map = new ol.Map({
    target: 'map',
    layers: [
        new ol.layer.Tile({
        source: new ol.source.OSM() // OpenStreetMap como capa base
        })
],

view: new ol.View({
    center: ol.proj.fromLonLat([-90.68152, 14.41137]), // [longitud, latitud] EL mapa siempre va a inicar en estas coordenadas.
    zoom: 17 
})
});

// ============================================
// COORDENADAS DE LA RESIDENCIAL
// ============================================
const RESIDENCIAL_COORDS = [-90.68152, 14.41137]; // [longitud, latitud]
const RESIDENCIAL_COORDS_OL = ol.proj.fromLonLat(RESIDENCIAL_COORDS);
const RADIO_VISIBLE = 1000; // Metros - distancia para considerar que estamos "cerca" de la residencial

// ============================================
// FUNCIONALIDAD DE GEOLOCALIZACIÓN
// ============================================

// Variables globales para el marcador del usuario y la capa
let markerLayer;
let markerFeature;
let currentPosition = null;
let watchId = null;

// Creamos la capa para el marcador de ubicacion
function crearCapaMarcador() {
    markerLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const isPulsing = feature.get('pulsing') || false;
            const radius = isPulsing ? 12 : 8;
            
            return [
                // Círculo interior (marcador principal)
                new ol.style.Style({
                    image: new ol.style.Circle({
                        radius: radius,
                        fill: new ol.style.Fill({
                            color: '#4285F4' //aplicamos aqui el color para no confundirme con el CSS
                        }),
                        stroke: new ol.style.Stroke({
                            color: '#FFFFFF', // color del borde
                            width: 3
                        })
                    })
                }),
                // Círculo exterior (efecto para que se vea mamalon)
                new ol.style.Style({
                    image: new ol.style.Circle({
                        radius: 20,
                        fill: new ol.style.Fill({
                            color: 'rgba(66, 133, 244, 0.2)'
                        }),
                        stroke: new ol.style.Stroke({
                            color: 'rgba(66, 133, 244, 0.4)',
                            width: 2
                        })
                    })
                })
            ];
        }
    });
    
    map.addLayer(markerLayer);
}

// Funcion para actualizar constantemente el marcador de ubicación
function actualizarMarcador(coordinates, isPulsing = false) {
    // Si ya existe un marcador pues se actualiza
    if (markerFeature) {
        markerFeature.getGeometry().setCoordinates(coordinates);
        markerFeature.set('pulsing', isPulsing);
        // Forzar actualización del estilo sin refrescar toda la capa
        markerFeature.changed();
    } else {
        // de lo contrario creamos un nuevo marcador
        markerFeature = new ol.Feature({
            geometry: new ol.geom.Point(coordinates),
            pulsing: isPulsing
        });
        markerLayer.getSource().addFeature(markerFeature);
    }
    
    // Si está pulsando, quitar el efecto después de 2 segundos
    if (isPulsing) {
        setTimeout(() => {
            if (markerFeature) {
                markerFeature.set('pulsing', false);
                markerFeature.changed();
            }
        }, 2000);
    }
}

// ============================================
// FUNCIÓN PARA VERIFICAR SI EL MAPA ESTÁ CERCA DE LA RESIDENCIAL
// ============================================

function verificarCercaniaResidencial() {
    const view = map.getView();
    const center = view.getCenter(); // Centro actual del mapa en coordenadas OL
    const zoom = view.getZoom();
    
    // Calcular distancia en metros entre el centro actual y la residencial
    // Primero convertir a coordenadas geográficas
    const centerLonLat = ol.proj.toLonLat(center);
    const residencialLonLat = RESIDENCIAL_COORDS;
    
    // Calcular distancia usando la fórmula de Haversine
    const distancia = calcularDistancia(
        centerLonLat[1], centerLonLat[0],
        residencialLonLat[1], residencialLonLat[0]
    );
    
    // El botón se muestra si:
    // 1. La distancia es mayor al radio visible
    // 2. O el zoom es menor a 15 (demasiado alejado)
    const mostrarBoton = distancia > RADIO_VISIBLE || zoom < 15;
    
    const btn = document.getElementById('residencialBtn');
    if (mostrarBoton) {
        btn.classList.add('mostrar');
        btn.style.display = 'flex';
        console.log(`📍 Distancia a residencial: ${Math.round(distancia)}m - Mostrando botón`);
    } else {
        btn.classList.remove('mostrar');
        btn.style.display = 'none';
        console.log(`📍 Distancia a residencial: ${Math.round(distancia)}m - Ocultando botón`);
    }
}

// ============================================
// FUNCIÓN PARA CALCULAR DISTANCIA (Haversine)
// ============================================

function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distancia = R * c * 1000; // Convertir a metros
    return distancia;
}

// ============================================
// FUNCIÓN PARA VOLVER A LA RESIDENCIAL
// ============================================

function volverAResidencial() {
    console.log('🏠 Volviendo a la residencial...');
    
    // Animación suave hacia la residencial
    map.getView().animate({
        center: RESIDENCIAL_COORDS_OL,
        zoom: 17,
        duration: 1000 // 1 segundo
    });
    
    // Después de la animación, verificar si el botón debe ocultarse
    setTimeout(() => {
        verificarCercaniaResidencial();
    }, 1200);
}

// ============================================
// FUNCIÓN PARA CENTRAR EN LA UBICACIÓN DEL USUARIO
// ============================================

function centrarEnMiUbicacion() {
    const btn = document.getElementById('miUbicacionBtn');
    
    // Verificar si el navegador soporta geolocalizacion
    if (!("geolocation" in navigator)) {
        alert("❌ Tu navegador no soporta geolocalización");
        return;
    }
    
    // Cambiar estado del botón
    btn.classList.add('buscando');
    btn.innerHTML = `
        <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
        </svg>
        Buscando...
    `;
    
    // Opciones de geolocalización
    const geolocationOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
    };
    
    // Obtener la ubicacion actual
    navigator.geolocation.getCurrentPosition(
        // Funcion de exito
        function(position) {
            const lon = position.coords.longitude;
            const lat = position.coords.latitude;
            
            console.log(`📍 Ubicación encontrada: Lat: ${lat}, Lon: ${lon}`);
            console.log(`🎯 Precisión: ${position.coords.accuracy} metros`);
            
            // Guardar posición actual
            currentPosition = { lat, lon };
            
            // Convertir coordenadas al sistema de OpenLayers
            const coordinates = ol.proj.fromLonLat([lon, lat]);
            
            // Actualizar marcador con efecto de pulso
            actualizarMarcador(coordinates, true);
            
            // Mover la vista del mapa a la ubicación del usuario
            map.getView().animate({
                center: coordinates,
                zoom: 18,
                duration: 1000
            });
            
            // Restaurar el boton
            btn.classList.remove('buscando');
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
                </svg>
                Mi ubicación
            `;
            
            // Verificar si el botón de residencial debe mostrarse
            setTimeout(() => {
                verificarCercaniaResidencial();
            }, 1500);
            
            console.log('✅ Mapa centrado en tu ubicación');
        },
        // Función de error
        function(error) {
            let errorMessage = '';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = '❌ Permiso denegado. Por favor, permite el acceso a tu ubicación en la configuración del navegador.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = '❌ No se pudo obtener tu ubicación. Verifica tu conexión GPS o Wi-Fi.';
                    break;
                case error.TIMEOUT:
                    errorMessage = '⏰ Tiempo de espera agotado. Verifica tu conexión y vuelve a intentar.';
                    break;
                default:
                    errorMessage = `❌ Error desconocido: ${error.message}`;
            }
            console.log(errorMessage);
            alert(errorMessage);
            
            // Restaurar el botón
            btn.classList.remove('buscando');
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
                </svg>
                Mi ubicación
            `;
        },
        geolocationOptions
    );
}

// ============================================
// INICIALIZACIÓN
// ============================================

// Crear la capa de marcador al inicio
crearCapaMarcador();

// Agregar evento al botón de Mi Ubicación
document.addEventListener('DOMContentLoaded', function() {
    const btnUbicacion = document.getElementById('miUbicacionBtn');
    if (btnUbicacion) {
        btnUbicacion.addEventListener('click', centrarEnMiUbicacion);
        console.log('✅ Botón "Mi ubicación" configurado');
    } else {
        console.warn('⚠️ No se encontró el botón "Mi ubicación"');
    }
    
    // Agregar evento al botón de Volver a la Residencial
    const btnResidencial = document.getElementById('residencialBtn');
    if (btnResidencial) {
        btnResidencial.addEventListener('click', volverAResidencial);
        console.log('✅ Botón "Volver a la residencial" configurado');
    } else {
        console.warn('⚠️ No se encontró el botón "Volver a la residencial"');
    }
});

// ============================================
// DETECTAR CAMBIOS EN LA VISTA DEL MAPA
// ============================================

// Escuchar eventos de movimiento del mapa para verificar si mostrar el botón
map.getView().on('change:center', function() {
    verificarCercaniaResidencial();
});

map.getView().on('change:resolution', function() {
    verificarCercaniaResidencial();
});

// También verificar después de animaciones
map.getView().on('change', function() {
    // Verificar después de que termine la animación
    clearTimeout(window._verificarTimeout);
    window._verificarTimeout = setTimeout(() => {
        verificarCercaniaResidencial();
    }, 300);
});

// ============================================
// INTENTAR OBTENER UBICACIÓN AUTOMÁTICAMENTE
// ============================================

setTimeout(() => {
    centrarEnMiUbicacion();
}, 1000);

console.log('🗺️ Mapa de OpenLayers cargado correctamente!');
