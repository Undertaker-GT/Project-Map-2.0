// ============================================
// GESTOR DE ÁREAS INFANTILES - JSON + LocalStorage
// ============================================
class GestorAreasInfantiles {
    constructor() {
        this.areas = {};
        this.version = '';
        this.ultimaActualizacion = '';
        this.cargado = false;
        this.callbacks = [];
        
        this.URL_VERSION = 'data/areas_infantiles_version.json';
        this.URL_DATOS = 'data/areas_infantiles.json';
    }

    async cargarDatos() {
        console.log('🛝 Iniciando carga de áreas infantiles...');
        
        const versionServidor = await this.obtenerVersionServidor();
        
        if (!versionServidor) {
            const locales = this.cargarDesdeLocalStorage();
            if (locales) {
                console.log('📦 Usando áreas infantiles locales (sin verificación)');
                this.areas = locales.areas;
                this.version = locales.version;
                this.ultimaActualizacion = locales.ultimaActualizacion;
                this.cargado = true;
                this.notificarCallbacks();
                return true;
            }
            return false;
        }
        
        console.log(`📌 Versión áreas infantiles en servidor: ${versionServidor.version}`);
        const datosLocales = this.cargarDesdeLocalStorage();
        
        if (datosLocales) {
            if (datosLocales.version === versionServidor.version) {
                console.log('✅ Versión áreas infantiles coincide. Usando caché local 🚀');
                this.areas = datosLocales.areas;
                this.version = datosLocales.version;
                this.ultimaActualizacion = datosLocales.ultimaActualizacion;
                this.cargado = true;
                this.notificarCallbacks();
                return true;
            } else {
                console.log(`🔄 Versión áreas infantiles desactualizada!`);
            }
        }
        
        const cargado = await this.cargarDesdeJSON();
        if (cargado) {
            console.log(`✅ Áreas infantiles actualizadas (versión ${this.version})`);
            this.guardarEnLocalStorage();
            this.cargado = true;
            this.notificarCallbacks();
            return true;
        }
        
        if (datosLocales) {
            console.warn('⚠️ Usando áreas infantiles locales como fallback');
            this.areas = datosLocales.areas;
            this.version = datosLocales.version;
            this.ultimaActualizacion = datosLocales.ultimaActualizacion;
            this.cargado = true;
            this.notificarCallbacks();
            return true;
        }
        
        return false;
    }

    async obtenerVersionServidor() {
        try {
            const response = await fetch(this.URL_VERSION, { cache: 'no-store' });
            if (!response.ok) return null;
            const data = await response.json();
            return data;
        } catch (error) {
            return null;
        }
    }

    cargarDesdeLocalStorage() {
        try {
            const data = localStorage.getItem('areas_infantiles_data');
            if (!data) return null;
            const parsed = JSON.parse(data);
            if (!parsed.areas || !parsed.version) return null;
            return parsed;
        } catch (error) {
            return null;
        }
    }

    async cargarDesdeJSON() {
        try {
            const response = await fetch(this.URL_DATOS, { cache: 'no-store' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            this.areas = data.areas;
            this.version = data.version || '1.0.0';
            this.ultimaActualizacion = data.ultimaActualizacion || new Date().toISOString().split('T')[0];
            return true;
        } catch (error) {
            console.error('❌ Error al cargar áreas infantiles:', error);
            return false;
        }
    }

    guardarEnLocalStorage() {
        try {
            const data = {
                version: this.version,
                ultimaActualizacion: this.ultimaActualizacion,
                areas: this.areas,
                fechaCache: new Date().toISOString()
            };
            localStorage.setItem('areas_infantiles_data', JSON.stringify(data));
            return true;
        } catch (error) {
            return false;
        }
    }

    getArea(id) {
        return this.areas[id] || null;
    }

    getTodasAreas() {
        return this.areas;
    }

    getListaAreas() {
        return Object.keys(this.areas).map(id => ({
            id: id,
            ...this.areas[id]
        }));
    }

    onCambio(callback) {
        this.callbacks.push(callback);
    }

    notificarCallbacks() {
        this.callbacks.forEach(callback => {
            try {
                callback(this.areas);
            } catch (error) {
                console.error('❌ Error en callback áreas infantiles:', error);
            }
        });
    }
}

const gestorAreasInfantiles = new GestorAreasInfantiles();
window.gestorAreasInfantiles = gestorAreasInfantiles;