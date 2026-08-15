// ============================================
// GESTOR DE SALONES DE EVENTOS - JSON + LocalStorage
// ============================================
class GestorSalonesEventos {
    constructor() {
        this.salones = {};
        this.version = '';
        this.ultimaActualizacion = '';
        this.cargado = false;
        this.callbacks = [];
        
        this.URL_VERSION = 'data/salones_eventos_version.json';
        this.URL_DATOS = 'data/salones_eventos.json';
    }

    async cargarDatos() {
        console.log('🏡 Iniciando carga de salones de eventos...');
        
        const versionServidor = await this.obtenerVersionServidor();
        
        if (!versionServidor) {
            const locales = this.cargarDesdeLocalStorage();
            if (locales) {
                console.log('📦 Usando salones locales (sin verificación)');
                this.salones = locales.salones;
                this.version = locales.version;
                this.ultimaActualizacion = locales.ultimaActualizacion;
                this.cargado = true;
                this.notificarCallbacks();
                return true;
            }
            return false;
        }
        
        console.log(`📌 Versión salones en servidor: ${versionServidor.version}`);
        const datosLocales = this.cargarDesdeLocalStorage();
        
        if (datosLocales) {
            if (datosLocales.version === versionServidor.version) {
                console.log('✅ Versión salones coincide. Usando caché local 🚀');
                this.salones = datosLocales.salones;
                this.version = datosLocales.version;
                this.ultimaActualizacion = datosLocales.ultimaActualizacion;
                this.cargado = true;
                this.notificarCallbacks();
                return true;
            } else {
                console.log(`🔄 Versión salones desactualizada!`);
            }
        }
        
        const cargado = await this.cargarDesdeJSON();
        if (cargado) {
            console.log(`✅ Salones actualizados (versión ${this.version})`);
            this.guardarEnLocalStorage();
            this.cargado = true;
            this.notificarCallbacks();
            return true;
        }
        
        if (datosLocales) {
            console.warn('⚠️ Usando salones locales como fallback');
            this.salones = datosLocales.salones;
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
            const data = localStorage.getItem('salones_eventos_data');
            if (!data) return null;
            const parsed = JSON.parse(data);
            if (!parsed.salones || !parsed.version) return null;
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
            this.salones = data.salones;
            this.version = data.version || '1.0.0';
            this.ultimaActualizacion = data.ultimaActualizacion || new Date().toISOString().split('T')[0];
            return true;
        } catch (error) {
            console.error('❌ Error al cargar salones:', error);
            return false;
        }
    }

    guardarEnLocalStorage() {
        try {
            const data = {
                version: this.version,
                ultimaActualizacion: this.ultimaActualizacion,
                salones: this.salones,
                fechaCache: new Date().toISOString()
            };
            localStorage.setItem('salones_eventos_data', JSON.stringify(data));
            return true;
        } catch (error) {
            return false;
        }
    }

    getSalon(id) {
        return this.salones[id] || null;
    }

    getTodosSalones() {
        return this.salones;
    }

    getListaSalones() {
        return Object.keys(this.salones).map(id => ({
            id: id,
            ...this.salones[id]
        }));
    }

    onCambio(callback) {
        this.callbacks.push(callback);
    }

    notificarCallbacks() {
        this.callbacks.forEach(callback => {
            try {
                callback(this.salones);
            } catch (error) {
                console.error('❌ Error en callback salones:', error);
            }
        });
    }
}

const gestorSalonesEventos = new GestorSalonesEventos();
window.gestorSalonesEventos = gestorSalonesEventos;