// ============================================
// GESTOR DE DEPORTES - JSON + LocalStorage
// ============================================
class GestorDeportes {
    constructor() {
        this.deportes = {};
        this.version = '';
        this.ultimaActualizacion = '';
        this.cargado = false;
        this.callbacks = [];
        
        this.URL_VERSION = 'data/deportes_version.json';
        this.URL_DATOS = 'data/deportes.json';
    }

    async cargarDatos() {
        console.log('🏟️ Iniciando carga de centros deportivos...');
        
        const versionServidor = await this.obtenerVersionServidor();
        
        if (!versionServidor) {
            const locales = this.cargarDesdeLocalStorage();
            if (locales) {
                console.log('📦 Usando deportes locales (sin verificación)');
                this.deportes = locales.deportes;
                this.version = locales.version;
                this.ultimaActualizacion = locales.ultimaActualizacion;
                this.cargado = true;
                this.notificarCallbacks();
                return true;
            }
            return false;
        }
        
        console.log(`📌 Versión deportes en servidor: ${versionServidor.version}`);
        const datosLocales = this.cargarDesdeLocalStorage();
        
        if (datosLocales) {
            if (datosLocales.version === versionServidor.version) {
                console.log('✅ Versión deportes coincide. Usando caché local 🚀');
                this.deportes = datosLocales.deportes;
                this.version = datosLocales.version;
                this.ultimaActualizacion = datosLocales.ultimaActualizacion;
                this.cargado = true;
                this.notificarCallbacks();
                return true;
            } else {
                console.log(`🔄 Versión deportes desactualizada!`);
            }
        }
        
        const cargado = await this.cargarDesdeJSON();
        if (cargado) {
            console.log(`✅ Deportes actualizados (versión ${this.version})`);
            this.guardarEnLocalStorage();
            this.cargado = true;
            this.notificarCallbacks();
            return true;
        }
        
        if (datosLocales) {
            console.warn('⚠️ Usando deportes locales como fallback');
            this.deportes = datosLocales.deportes;
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
            const data = localStorage.getItem('deportes_data');
            if (!data) return null;
            const parsed = JSON.parse(data);
            if (!parsed.deportes || !parsed.version) return null;
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
            this.deportes = data.deportes;
            this.version = data.version || '1.0.0';
            this.ultimaActualizacion = data.ultimaActualizacion || new Date().toISOString().split('T')[0];
            return true;
        } catch (error) {
            console.error('❌ Error al cargar deportes:', error);
            return false;
        }
    }

    guardarEnLocalStorage() {
        try {
            const data = {
                version: this.version,
                ultimaActualizacion: this.ultimaActualizacion,
                deportes: this.deportes,
                fechaCache: new Date().toISOString()
            };
            localStorage.setItem('deportes_data', JSON.stringify(data));
            return true;
        } catch (error) {
            return false;
        }
    }

    getDeporte(id) {
        return this.deportes[id] || null;
    }

    getTodosDeportes() {
        return this.deportes;
    }

    getListaDeportes() {
        return Object.keys(this.deportes).map(id => ({
            id: id,
            ...this.deportes[id]
        }));
    }

    getDeportesPorTipo(tipo) {
        return this.getListaDeportes().filter(d => d.tipo === tipo);
    }

    onCambio(callback) {
        this.callbacks.push(callback);
    }

    notificarCallbacks() {
        this.callbacks.forEach(callback => {
            try {
                callback(this.deportes);
            } catch (error) {
                console.error('❌ Error en callback deportes:', error);
            }
        });
    }
}

const gestorDeportes = new GestorDeportes();
window.gestorDeportes = gestorDeportes;