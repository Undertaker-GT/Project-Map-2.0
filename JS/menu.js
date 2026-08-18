// ============================================================
//  MENÚ LATERAL - VERSIÓN CORREGIDA
// ============================================================

/**
 * Alterna la visibilidad del menú lateral
 */
function toggleSideMenu() {
    const menu = document.getElementById("sideMenu");
    const overlay = document.getElementById("menuOverlay");
    
    menu.classList.toggle("active");
    overlay.classList.toggle("active");
    
    if (menu.classList.contains("active")) {
        document.body.style.overflow = "hidden";
    } else {
        document.body.style.overflow = "";
    }
}

/**
 * Cierra el menú lateral
 */
function closeSideMenu() {
    const menu = document.getElementById("sideMenu");
    const overlay = document.getElementById("menuOverlay");
    
    menu.classList.remove("active");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
}

/**
 * Centra el mapa en la ubicación del usuario
 */
function centrarEnUsuario() {
    closeSideMenu();
    
    if (!currentPosition) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    const coords = [position.coords.longitude, position.coords.latitude];
                    currentPosition = { lat: position.coords.latitude, lon: position.coords.longitude };
                    map.getView().setCenter(coords);
                    map.getView().setZoom(18);
                },
                function() {
                    alert("No se pudo obtener tu ubicación. Activa el GPS.");
                },
                { enableHighAccuracy: true }
            );
        } else {
            alert("Tu navegador no soporta geolocalización.");
        }
        return;
    }
    
    map.getView().setCenter([currentPosition.lon, currentPosition.lat]);
    map.getView().setZoom(18);
}

/**
 * Abre el modal de búsqueda de sectores
 */
function abrirModalBusquedaSector() {
    closeSideMenu();
    // Aquí puedes implementar la búsqueda de sectores
    alert('🔍 Función de búsqueda de sectores (pendiente de implementar)');
}

/**
 * Cancela la ruta activa
 */
function cancelarRuta() {
    closeSideMenu();
    
    if (typeof gestorRutas !== 'undefined' && gestorRutas) {
        gestorRutas.cancelarRuta();
    }
    
    const panel = document.getElementById('routePanel');
    if (panel) panel.remove();
    
    // Ocultar polígonos activos
    if (typeof sectorPolygonLayer !== 'undefined' && sectorPolygonLayer) {
        sectorPolygonLayer.setVisible(false);
    }
    if (typeof centroPolygonLayer !== 'undefined' && centroPolygonLayer) {
        centroPolygonLayer.setVisible(false);
    }
    if (typeof deportePolygonLayer !== 'undefined' && deportePolygonLayer) {
        deportePolygonLayer.setVisible(false);
    }
    if (typeof areaPolygonLayer !== 'undefined' && areaPolygonLayer) {
        areaPolygonLayer.setVisible(false);
    }
    if (typeof centroEducativoPolygonLayer !== 'undefined' && centroEducativoPolygonLayer) {
        centroEducativoPolygonLayer.setVisible(false);
    }
    if (typeof salonPolygonLayer !== 'undefined' && salonPolygonLayer) {
        salonPolygonLayer.setVisible(false);
    }
    if (typeof gimnasioPolygonLayer !== 'undefined' && gimnasioPolygonLayer) {
        gimnasioPolygonLayer.setVisible(false);
    }
    
    console.log("🗑️ Ruta cancelada");
}

/**
 * Vuelve a la vista de la residencial
 */
function volverResidencial() {
    closeSideMenu();
    
    const centerCoords = [-90.68142, 14.41137];
    map.getView().animate({
        center: centerCoords,
        zoom: 17,
        duration: 800
    });
}

// ============================================================
//  CONTROL DE CAPAS - CONEXIÓN DIRECTA CON FUNCIONES EXISTENTES
// ============================================================

// Estado de las capas (true = visible)
const layerStates = {
    sectores: true,
    comercios: true,
    deportes: true,
    areas: true,
    educativos: true,
    salones: true,
    gimnasios: true,
    gasolineras: true
};

/**
 * Inicializa los botones de control de capas
 */
function initLayerToggles() {
    const toggleButtons = document.querySelectorAll('.toggle-layer');
    
    toggleButtons.forEach(button => {
        const layerName = button.dataset.layer;
        const badge = button.querySelector('.layer-toggle-badge');
        
        // Actualizar estado inicial
        if (layerStates[layerName]) {
            badge.textContent = 'ON';
            badge.classList.remove('off');
        } else {
            badge.textContent = 'OFF';
            badge.classList.add('off');
        }
        
        // Remover eventos anteriores (para evitar duplicados)
        button.removeEventListener('click', handleLayerToggle);
        button.addEventListener('click', handleLayerToggle);
    });
}

/**
 * Manejador de eventos para toggle de capas
 */
function handleLayerToggle(e) {
    e.stopPropagation();
    const layerName = this.dataset.layer;
    toggleLayer(layerName);
}

/**
 * Alterna la visibilidad de una capa - CONEXIÓN DIRECTA
 */
function toggleLayer(layerName) {
    // Cambiar estado
    layerStates[layerName] = !layerStates[layerName];
    
    // Actualizar badge
    const button = document.querySelector(`.toggle-layer[data-layer="${layerName}"]`);
    if (button) {
        const badge = button.querySelector('.layer-toggle-badge');
        if (layerStates[layerName]) {
            badge.textContent = 'ON';
            badge.classList.remove('off');
        } else {
            badge.textContent = 'OFF';
            badge.classList.add('off');
        }
    }
    
    // ============================================
    // LLAMAR A LAS FUNCIONES CORRESPONDIENTES
    // ============================================
    switch(layerName) {
        case 'sectores':
            console.log('🔄 Toggle Sectores:', layerStates[layerName] ? 'ON' : 'OFF');
            if (typeof toggleSectores === 'function') {
                toggleSectores();
            } else {
                console.warn('⚠️ toggleSectores no está definida');
                // Fallback: cambiar visibilidad directamente
                if (typeof sectorMarkerLayer !== 'undefined' && sectorMarkerLayer) {
                    sectorMarkerLayer.setVisible(layerStates[layerName]);
                }
                if (typeof sectorPolygonLayer !== 'undefined' && sectorPolygonLayer) {
                    if (!layerStates[layerName]) sectorPolygonLayer.setVisible(false);
                }
            }
            break;
            
        case 'comercios':
            console.log('🔄 Toggle Comercios:', layerStates[layerName] ? 'ON' : 'OFF');
            if (typeof toggleComercios === 'function') {
                toggleComercios();
            } else {
                console.warn('⚠️ toggleComercios no está definida');
                if (typeof centroMarkerLayer !== 'undefined' && centroMarkerLayer) {
                    centroMarkerLayer.setVisible(layerStates[layerName]);
                }
                if (typeof centroPolygonLayer !== 'undefined' && centroPolygonLayer) {
                    if (!layerStates[layerName]) centroPolygonLayer.setVisible(false);
                }
            }
            break;
            
        case 'deportes':
            console.log('🔄 Toggle Deportes:', layerStates[layerName] ? 'ON' : 'OFF');
            if (typeof toggleDeportes === 'function') {
                toggleDeportes();
            } else {
                console.warn('⚠️ toggleDeportes no está definida');
                if (typeof deporteMarkerLayer !== 'undefined' && deporteMarkerLayer) {
                    deporteMarkerLayer.setVisible(layerStates[layerName]);
                }
                if (typeof deportePolygonLayer !== 'undefined' && deportePolygonLayer) {
                    if (!layerStates[layerName]) deportePolygonLayer.setVisible(false);
                }
            }
            break;
            
        case 'areas':
            console.log('🔄 Toggle Áreas Infantiles:', layerStates[layerName] ? 'ON' : 'OFF');
            if (typeof toggleAreas === 'function') {
                toggleAreas();
            } else {
                console.warn('⚠️ toggleAreas no está definida');
                if (typeof areaMarkerLayer !== 'undefined' && areaMarkerLayer) {
                    areaMarkerLayer.setVisible(layerStates[layerName]);
                }
                if (typeof areaPolygonLayer !== 'undefined' && areaPolygonLayer) {
                    if (!layerStates[layerName]) areaPolygonLayer.setVisible(false);
                }
            }
            break;
            
        case 'educativos':
            console.log('🔄 Toggle Centros Educativos:', layerStates[layerName] ? 'ON' : 'OFF');
            if (typeof toggleCentrosEducativos === 'function') {
                toggleCentrosEducativos();
            } else {
                console.warn('⚠️ toggleCentrosEducativos no está definida');
                if (typeof centroEducativoMarkerLayer !== 'undefined' && centroEducativoMarkerLayer) {
                    centroEducativoMarkerLayer.setVisible(layerStates[layerName]);
                }
                if (typeof centroEducativoPolygonLayer !== 'undefined' && centroEducativoPolygonLayer) {
                    if (!layerStates[layerName]) centroEducativoPolygonLayer.setVisible(false);
                }
            }
            break;
            
        case 'salones':
            console.log('🔄 Toggle Salones:', layerStates[layerName] ? 'ON' : 'OFF');
            if (typeof toggleSalones === 'function') {
                toggleSalones();
            } else {
                console.warn('⚠️ toggleSalones no está definida');
                if (typeof salonMarkerLayer !== 'undefined' && salonMarkerLayer) {
                    salonMarkerLayer.setVisible(layerStates[layerName]);
                }
                if (typeof salonPolygonLayer !== 'undefined' && salonPolygonLayer) {
                    if (!layerStates[layerName]) salonPolygonLayer.setVisible(false);
                }
            }
            break;
            
        case 'gimnasios':
            console.log('🔄 Toggle Gimnasios:', layerStates[layerName] ? 'ON' : 'OFF');
            if (typeof toggleGimnasios === 'function') {
                toggleGimnasios();
            } else {
                console.warn('⚠️ toggleGimnasios no está definida');
                if (typeof gimnasioMarkerLayer !== 'undefined' && gimnasioMarkerLayer) {
                    gimnasioMarkerLayer.setVisible(layerStates[layerName]);
                }
                if (typeof gimnasioPolygonLayer !== 'undefined' && gimnasioPolygonLayer) {
                    if (!layerStates[layerName]) gimnasioPolygonLayer.setVisible(false);
                }
            }
            break;
            
        case 'gasolineras':
            console.log('🔄 Toggle Gasolineras:', layerStates[layerName] ? 'ON' : 'OFF');
            if (typeof toggleGasolineras === 'function') {
                toggleGasolineras();
            } else {
                console.warn('⚠️ toggleGasolineras no está definida');
                if (typeof gasolineraMarkerLayer !== 'undefined' && gasolineraMarkerLayer) {
                    gasolineraMarkerLayer.setVisible(layerStates[layerName]);
                }
            }
            break;
            
        default:
            console.warn(`⚠️ Capa desconocida: ${layerName}`);
    }
}

// ============================================================
//  INICIALIZACIÓN
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar botones de capas con un pequeño retraso
    // para asegurar que todas las funciones estén cargadas
    setTimeout(function() {
        initLayerToggles();
        console.log('✅ Botones de capas inicializados correctamente');
    }, 1500);
    
    // Cerrar menú al hacer clic en cualquier botón del menú
    const menuItems = document.querySelectorAll('.side-menu-content .menu-item');
    menuItems.forEach(item => {
        // Solo cerrar si NO es un botón de toggle (para no cerrar al hacer toggle)
        if (!item.classList.contains('toggle-layer')) {
            item.addEventListener('click', function() {
                setTimeout(closeSideMenu, 200);
            });
        }
    });
    
    // Cerrar menú al hacer clic en el overlay
    const overlay = document.getElementById('menuOverlay');
    if (overlay) {
        overlay.addEventListener('click', closeSideMenu);
    }
});

// Cerrar con tecla ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeSideMenu();
    }
});

console.log('📋 menu.js cargado correctamente');