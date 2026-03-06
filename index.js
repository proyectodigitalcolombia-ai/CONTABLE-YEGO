const express = require('express');
const { Sequelize, DataTypes, QueryTypes } = require('sequelize');
require('dotenv').config();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ============================================
// DATABASE CONNECTION
// ============================================
const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================
const TARIFAS_ICA = {
  'BUENAVENTURA': 0.004,
  'CARTAGENA': 0.007,
  'BARRANQUILLA': 0.007,
  'SANTA MARTA': 0.007,
  'YUMBO': 0.005,
  'FUNZA': 0.005,
  'DEFAULT': 0.01
};

const ANTICIPOS = {
  'Sin anticipo (0)': 0,
  'Anticipo medio (50%)': 0.50,
  'Anticipo parcial (60%)': 0.60,
  'Anticipo parcial (65%)': 0.65,
  'Anticipo normal (70%)': 0.70,
  'Anticipo parcial (75%)': 0.75,
  'Anticipo parcial (100%)': 1.00
};

const STYLES = {
  TD: 'padding: 10px; text-align: center; border-right: 1px solid #334155; white-space: nowrap;',
  SELECT: 'background: #0f172a; color: white; border: 1px solid #334155; border-radius: 4px; font-size: 10px; padding: 2px; cursor: pointer;',
  TH: 'padding: 15px 10px; text-align: center; border-right: 1px solid #475569; border-bottom: 2px solid #3b82f6; white-space: nowrap;',
  INPUT_DATE: 'background: #0f172a; color: white; border: 1px solid #334155; border-radius: 4px; font-size: 11px; padding: 2px; outline: none; cursor: pointer; color-scheme: dark;'
};

// ============================================
// DATABASE MODEL
// ============================================
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  v_facturar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' },
  tipo_anticipo: { type: DataTypes.STRING },
  valor_anticipo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  sobre_anticipo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  estado_ant: { type: DataTypes.STRING },
  fecha_pago_ant: { type: DataTypes.DATEONLY },
  tipo_cumplido: { type: DataTypes.STRING },
  fecha_cump_virtual: { type: DataTypes.DATEONLY },
  ent_manifiesto: { type: DataTypes.STRING, defaultValue: 'NO' },
  ent_remesa: { type: DataTypes.STRING, defaultValue: 'NO' },
  ent_hoja_tiempos: { type: DataTypes.STRING, defaultValue: 'NO' },
  ent_docs_cliente: { type: DataTypes.STRING, defaultValue: 'NO' },
  ent_facturas: { type: DataTypes.STRING, defaultValue: 'NO' },
  ent_tirilla_vacio: { type: DataTypes.STRING, defaultValue: 'NO' },
  ent_tiq_cargue: { type: DataTypes.STRING, defaultValue: 'NO' },
  ent_tiq_descargue: { type: DataTypes.STRING, defaultValue: 'NO' },
  presenta_novedades: { type: DataTypes.STRING, defaultValue: 'NO' },
  obs_novedad: { type: DataTypes.TEXT },
  valor_descuento: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  fecha_cump_docs: { type: DataTypes.DATEONLY },
  fecha_legalizacion: { type: DataTypes.DATEONLY },
  retefuente: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  reteica: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  saldo_a_pagar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  estado_final: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' },
  dias_sin_pagar: { type: DataTypes.INTEGER, defaultValue: 0 },
  dias_sin_cumplir: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { tableName: 'Yego_Finanzas' });

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Escapa caracteres especiales para seguridad en HTML
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.toString().replace(/[&<>"']/g, m => map[m]);
}

/**
 * Formatea valores monetarios
 */
function formatMoney(value) {
  return Number(value || 0).toLocaleString('es-CO');
}

/**
 * Obtiene tarifa ICA según origen
 */
function obtenerTarifaICA(origen) {
  const ciudadUp = (origen || '').toUpperCase();
  for (const [ciudad, tarifa] of Object.entries(TARIFAS_ICA)) {
    if (ciudad !== 'DEFAULT' && ciudadUp.includes(ciudad)) {
      return tarifa;
    }
  }
  return TARIFAS_ICA.DEFAULT;
}

/**
 * Calcula retención en la fuente (1% del flete)
 */
function calcularRetefuente(flete) {
  return Math.round(flete * 0.01);
}

/**
 * Calcula retención ICA
 */
function calcularReteICA(flete, origen) {
  const tarifa = obtenerTarifaICA(origen);
  return Math.round(flete * tarifa);
}

/**
 * Calcula saldo a pagar
 */
function calcularSaldo(flete, retefuente, reteica, valorAnticipo, sobreAnticipo, descuento) {
  return flete - retefuente - reteica - valorAnticipo - Number(sobreAnticipo || 0) - Number(descuento || 0);
}

/**
 * Genera select de entregas con opciones
 */
function renderSelectEntrega(cargaId, campo, valorActual) {
  const opciones = ['SI', 'NO', 'NO APLICA'];
  const options = opciones
    .map(opt => `<option value="${opt}" ${valorActual === opt ? 'selected' : ''}>${opt}</option>`)
    .join('');
  
  return `<select onchange="actualizarEntrega(${cargaId}, '${campo}', this.value)" style="${STYLES.SELECT}">
    ${options}
  </select>`;
}

/**
 * Genera formulario de anticipo
 */
function renderSelectAnticipo(cargaId, tipoActual, fletePagar, origen) {
  const opciones = [
    { label: '---', value: '' },
    ...Object.entries(ANTICIPOS).map(([label, porcentaje]) => ({
      label: label.replace('Anticipo', '').replace('Sin ', '').trim(),
      value: label
    }))
  ];

  const options = opciones
    .map(opt => `<option value="${opt.value}" ${tipoActual === opt.value ? 'selected' : ''}>${opt.label}</option>`)
    .join('');

  return `<select onchange="actualizarAnticipoRapido(${cargaId}, this.value, ${fletePagar}, '${escapeHtml(origen)}')" style="${STYLES.SELECT}">
    ${options}
  </select>`;
}

/**
 * Calcula diferencia de días entre dos fechas
 */
function calcularDias(fechaInicio, fechaFin) {
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  const diferencia = Math.floor((fin - inicio) / (1000 * 60 * 60 * 24));
  return diferencia > 0 ? diferencia : 0;
}

/**
 * Genera fila de tabla con todos los datos
 */
function generarFilaCarga(carga, finanza) {
  const f = finanza || {};
  const fletePagar = Number(f.v_flete) > 0 ? Number(f.v_flete) : Number(carga.f_p || 0);
  const fleteFacturar = Number(f.v_facturar) > 0 ? Number(f.v_facturar) : Number(carga.f_f || 0);
  
  const fechaRegistro = carga.createdAt 
    ? new Date(carga.createdAt).toLocaleDateString('es-CO') 
    : '---';
  
  const estadoContable = f.est_pago || 'PENDIENTE';
  
  // Cálculo de días
  const fechaInicio = carga.createdAt ? new Date(carga.createdAt) : new Date();
  const fechaFin = f.estado_final === 'TRANSFERIDO' && f.updatedAt ? new Date(f.updatedAt) : new Date();
  const diasSinPagar = calcularDias(fechaInicio, fechaFin);
  const colorDiasCss = f.estado_final === 'TRANSFERIDO' ? '#10b981' : '#ef4444';
  
  // Cálculo de retenciones
  const retefuente = calcularRetefuente(fletePagar);
  const reteica = calcularReteICA(fletePagar, carga.orig);

  const html = `
    <tr class="fila-carga" data-placa="${(carga.placa || '').toLowerCase()}" style="border-bottom: 1px solid #334155; font-size: 11px;">
      <td style="${STYLES.TD} color: #94a3b8;">#${carga.id}</td>
      <td style="${STYLES.TD}">${fechaRegistro}</td>
      <td style="${STYLES.TD}">${escapeHtml(carga.oficina || '---')}</td>
      <td style="${STYLES.TD}">${escapeHtml(carga.orig || '---')}</td>
      <td style="${STYLES.TD}">${escapeHtml(carga.dest || '---')}</td>
      <td style="${STYLES.TD}">${escapeHtml(carga.cli || '---')}</td>
      <td style="${STYLES.TD}">${escapeHtml(carga.cont || '---')}</td>
      <td style="${STYLES.TD}">${escapeHtml(carga.ped || '---')}</td>
      <td style="${STYLES.TD} background: rgba(59, 130, 246, 0.1); font-weight: bold;">${escapeHtml(carga.placa)}</td>
      <td style="${STYLES.TD}">${escapeHtml(carga.muc || '---')}</td>
      <td style="${STYLES.TD} color: #10b981; font-weight: bold;">$${formatMoney(fletePagar)}</td>
      <td style="${STYLES.TD} color: #3b82f6;">$${formatMoney(fleteFacturar)}</td>
      <td style="${STYLES.TD}">${escapeHtml(carga.f_act || '---')}</td>
      <td style="${STYLES.TD} color: #fbbf24;">${escapeHtml(carga.est_real || '---')}</td>
      <td style="${STYLES.TD}">
        ${renderSelectAnticipo(carga.id, f.tipo_anticipo, fletePagar, carga.orig)}
      </td>
      <td id="valor-ant-${carga.id}" style="${STYLES.TD}">$${formatMoney(f.valor_anticipo || 0)}</td>
      <td style="${STYLES.TD}">
        <input type="text" id="input-sobre-${carga.id}" value="$${formatMoney(f.sobre_anticipo || 0)}" 
            style="background: #0f172a; color: #fbbf24; border: 1px solid #334155; border-radius: 4px; font-size: 11px; padding: 4px; width: 100px; text-align: center; outline: none;"
            onfocus="this.type='number'; this.value='${Number(f.sobre_anticipo || 0)}'" onblur="formatToMoney(${carga.id}, this)">
      </td>
      <td style="${STYLES.TD}">
        <select onchange="actualizarEstadoFinanciero(${carga.id}, this.value)" style="${STYLES.SELECT} width: 100%;">
          <option value="PENDIENTE" ${estadoContable === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
          <option value="TRANSFERIDO" ${estadoContable === 'TRANSFERIDO' ? 'selected' : ''}>TRANSFERIDO</option>
        </select>
      </td>
      <td id="fecha-pago-${carga.id}" style="${STYLES.TD}">${f.fecha_pago_ant || '---'}</td>
      <td style="${STYLES.TD}">
        <select onchange="actualizarTipoCumplido(${carga.id}, this.value)" style="${STYLES.SELECT}">
          <option value="" ${!f.tipo_cumplido ? 'selected' : ''}>---</option>
          <option value="VIRTUAL" ${f.tipo_cumplido === 'VIRTUAL' ? 'selected' : ''}>VIRTUAL</option>
          <option value="FÍSICO" ${f.tipo_cumplido === 'FÍSICO' ? 'selected' : ''}>FÍSICO</option>
        </select>
      </td>
      <td id="fecha-virtual-${carga.id}" style="${STYLES.TD}">${f.fecha_cump_virtual || '---'}</td>
      <td style="${STYLES.TD}">${renderSelectEntrega(carga.id, 'ent_manifiesto', f.ent_manifiesto)}</td>
      <td style="${STYLES.TD}">${renderSelectEntrega(carga.id, 'ent_remesa', f.ent_remesa)}</td>
      <td style="${STYLES.TD}">${renderSelectEntrega(carga.id, 'ent_hoja_tiempos', f.ent_hoja_tiempos)}</td>
      <td style="${STYLES.TD}">${renderSelectEntrega(carga.id, 'ent_docs_cliente', f.ent_docs_cliente)}</td>
      <td style="${STYLES.TD}">${renderSelectEntrega(carga.id, 'ent_facturas', f.ent_facturas)}</td>
      <td style="${STYLES.TD}">${renderSelectEntrega(carga.id, 'ent_tirilla_vacio', f.ent_tirilla_vacio)}</td>
      <td style="${STYLES.TD}">${renderSelectEntrega(carga.id, 'ent_tiq_cargue', f.ent_tiq_cargue)}</td>
      <td style="${STYLES.TD}">${renderSelectEntrega(carga.id, 'ent_tiq_descargue', f.ent_tiq_descargue)}</td>
      <td style="${STYLES.TD}">
        <select onchange="gestionarNovedad(${carga.id}, this.value)" style="${STYLES.SELECT}">
          <option value="NO" ${f.presenta_novedades === 'NO' ? 'selected' : ''}>NO</option>
          <option value="SI" ${f.presenta_novedades === 'SI' ? 'selected' : ''}>SI</option>
        </select>
      </td>
      <td id="td-obs-${carga.id}" style="${STYLES.TD}">
        <div id="obs-${carga.id}" contenteditable="${f.presenta_novedades === 'SI'}" onblur="actualizarEntrega(${carga.id}, 'obs_novedad', this.innerText)"
             style="min-width: 100px; padding: 2px; border: ${f.presenta_novedades === 'SI' ? '1px solid #3b82f6' : 'none'}; border-radius: 4px;">
          ${f.presenta_novedades === 'SI' ? escapeHtml(f.obs_novedad || '') : '---'}
        </div>
      </td>
      <td id="td-descuento-${carga.id}" style="${STYLES.TD}">
        <input type="text" id="input-desc-${carga.id}" value="$${formatMoney(f.valor_descuento || 0)}" 
            style="background: #0f172a; color: #ef4444; border: 1px solid #334155; border-radius: 4px; font-size: 11px; padding: 4px; width: 100px; text-align: center; outline: none; display: ${f.presenta_novedades === 'SI' ? 'inline-block' : 'none'};"
            onfocus="this.type='number'; this.value='${Number(f.valor_descuento || 0)}'" onblur="formatToMoneyDesc(${carga.id}, this)">
        <span id="span-desc-${carga.id}" style="display: ${f.presenta_novedades === 'SI' ? 'none' : 'inline-block'};">---</span>
      </td>
      <td style="${STYLES.TD}">
        <input type="date" value="${f.fecha_cump_docs || ''}" style="${STYLES.INPUT_DATE}"
            onchange="actualizarEntrega(${carga.id}, 'fecha_cump_docs', this.value, '${carga.createdAt}')">
      </td>
      <td style="${STYLES.TD}">
        <input type="date" value="${f.fecha_legalizacion || ''}" style="${STYLES.INPUT_DATE}"
            onchange="actualizarEntrega(${carga.id}, 'fecha_legalizacion', this.value, '${carga.createdAt}')">
      </td>
      <td id="retefuente-${carga.id}" style="${STYLES.TD}">$${formatMoney(retefuente)}</td>
      <td id="reteica-${carga.id}" style="${STYLES.TD}">$${formatMoney(reteica)}</td>
      <td id="saldo-${carga.id}" style="${STYLES.TD} background: rgba(16, 185, 129, 0.1); font-weight: bold; color: #10b981;">$${formatMoney(f.saldo_a_pagar || 0)}</td>
      <td style="${STYLES.TD}">
        <select onchange="actualizarEstadoFinal(${carga.id}, this.value)" style="${STYLES.SELECT} width: 100%; border: 1px solid ${f.estado_final === 'TRANSFERIDO' ? '#10b981' : '#334155'};">
          <option value="PENDIENTE" ${f.estado_final === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
          <option value="TRANSFERIDO" ${f.estado_final === 'TRANSFERIDO' ? 'selected' : ''}>TRANSFERIDO</option>
        </select>
      </td>
      <td id="dias-pagar-${carga.id}" style="${STYLES.TD} color: ${colorDiasCss}; font-weight: bold;">
        ${f.estado_final === 'TRANSFERIDO' ? 'PAGADO EN ' : ''} ${diasSinPagar} días
      </td>
      <td style="${STYLES.TD} color: #3b82f6;">${f.dias_sin_cumplir || 0}</td>
      <td style="padding: 10px; text-align: center;">
        <a href="/editar/${carga.id}" style="color: #3b82f6; text-decoration: none; font-weight: bold;">[LIQUIDAR]</a>
      </td>
    </tr>
  `;

  return { html, fletePagar, estadoContable };
}

// ============================================
// MAIN ROUTES
// ============================================

app.get('/', async (req, res) => {
  try {
    const sql = `SELECT * FROM "Cargas" WHERE placa IS NOT NULL AND placa != '' ORDER BY id DESC LIMIT 150`;
    const cargas = await db.query(sql, { type: QueryTypes.SELECT });
    const finanzas = await Finanza.findAll();

    let totalPendiente = 0;
    let filasHtml = '';

    cargas.forEach(carga => {
      const finanza = finanzas.find(fin => fin.cargaId === carga.id);
      const { html, fletePagar, estadoContable } = generarFilaCarga(carga, finanza);
      
      if (estadoContable === 'PENDIENTE') {
        totalPendiente += fletePagar;
      }
      
      filasHtml += html;
    });

    const headerHtml = generarHeaderTabla(filasHtml, totalPendiente);
    res.send(headerHtml);

  } catch (err) {
    console.error('Error en GET /:', err);
    res.status(500).send(`<h2>Error: ${escapeHtml(err.message)}</h2>`);
  }
});

/**
 * Genera el encabezado HTML de la tabla
 */
function generarHeaderTabla(filasHtml, totalPendiente) {
  const encabezados = [
    'ID', 'FECHA REGISTRO', 'OFICINA', 'ORIGEN', 'DESTINO', 'CLIENTE',
    'CONTENEDOR', 'PEDIDO', 'PLACA', 'MUC', 'FLETE A PAGAR',
    'FLETE A FACTURAR', 'FECHA ACTUALIZACIÓN', 'ESTADO FINAL LOGIS',
    'TIPO DE ANTICIPO', 'VALOR ANTICIPO', 'SOBRE ANTICIPO', 'ESTADO',
    'FECHA DE PAGO ANTICIPO', 'TIPO DE CUMPLIDO', 'FECHA CUMPLIDO VIRTUAL',
    'ENTREGA DE MANIFIESTO', 'ENTREGA DE REMESA', 'ENTREGA DE HOJA DE TIEMPOS',
    'ENTREGA DE DOCUMENTOS CLIENTE', 'ENTREGA DE FACTURAS',
    'ENTREGA DE TIRILLA CONTENEDOR VACÍO', 'ENTREGA DE TIQUETE DE CARGUE (GRANEL)',
    'ENTREGA DE TIQUETE DE DESCARGUE (GRANEL)', '¿EL SERVICIO PRESENTA NOVEDADES?',
    'OBSERVACION NOVEDAD', 'VALOR DESCUENTO', 'FECHA DE CUMPLIDO DOCUMENTOS',
    'FECHA DE LEGALIZACIÓN', 'RETEFUENTE', 'RETEICA', 'SALDO A PAGAR',
    'ESTADO FINAL', 'DÍAS SIN PAGAR', 'DÍAS SIN CUMPLIR', 'ACCIÓN'
  ];

  const encabezadosHtml = encabezados.map(enc => `<th style="${STYLES.TH}">${enc}</th>`).join('');

  return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>YEGO Sistema Contable</title>
    </head>
    <body style="background:#0f172a; color:#f1f5f9; font-family: 'Segoe UI', sans-serif; padding:15px; margin:0;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; background: #1e293b; padding: 12px; border-radius: 8px; border: 1px solid #334155;">
        <h2 style="margin:0; color: #3b82f6;">YEGO SISTEMA CONTABLE</h2>
        <div style="text-align: right; background: rgba(239, 68, 68, 0.1); padding: 5px 15px; border-radius: 6px; border: 1px solid #ef4444;">
          <small style="color:#ef4444; font-weight: bold;">TOTAL POR PAGAR:</small><br>
          <b style="color:#f1f5f9; font-size: 20px;">$ ${formatMoney(totalPendiente)}</b>
        </div>
      </div>

      <input type="text" id="buscador" placeholder="🔍 Filtrar por placa..." 
             style="width:100%; padding:12px; margin-bottom:15px; border-radius:6px; border:1px solid #334155; background:#1e293b; color:white; outline: none;">

      <div style="overflow-x: auto; border-radius: 8px; border: 1px solid #334155;">
        <table style="width:100%; border-collapse:collapse; background:#1e293b; min-width: 6500px;">
          <thead style="background:#1e40af; color: white; font-size: 10px; text-transform: uppercase;">
            <tr>${encabezadosHtml}</tr>
          </thead>
          <tbody id="tabla-cargas">${filasHtml}</tbody>
        </table>
      </div>

      <script>
        ${obtenerScriptsCliente()}
      </script>
    </body>
    </html>`;
}

/**
 * Retorna scripts del cliente
 */
function obtenerScriptsCliente() {
  return `
    const ANTICIPOS_CONFIG = ${JSON.stringify(ANTICIPOS)};

    function colorDias(dias) {
      if (dias > 30) return '#ef4444';
      if (dias > 15) return '#fbbf24';
      return '#10b981';
    }

    function recalcularDias(cargaId, fechaRegistroStr) {
      const fechaRegistro = new Date(fechaRegistroStr);
      const fechaHoy = new Date();
      const diffTiempo = Math.abs(fechaHoy - fechaRegistro);
      const diffDias = Math.floor(diffTiempo / (1000 * 60 * 60 * 24));
      
      const celda = document.getElementById("dias-pagar-" + cargaId);
      if (celda) {
        celda.innerText = diffDias + " días";
        celda.style.color = colorDias(diffDias);
      }
    }

    async function actualizarEntrega(cargaId, campo, valor, fechaReg) {
      try {
        await fetch('/actualizar-entrega', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cargaId, campo, valor })
        });
        if ((campo === 'fecha_cump_docs' || campo === 'fecha_legalizacion') && fechaReg) {
          recalcularDias(cargaId, fechaReg);
        }
      } catch (e) { 
        console.error("Error al actualizar", e); 
        alert("Error al guardar los datos");
      }
    }

    async function actualizarAnticipoRapido(cargaId, valorSeleccionado, flete, origen) {
      if (!valorSeleccionado) return;

      const porcentaje = ANTICIPOS_CONFIG[valorSeleccionado] || 0;
      const valorCalculado = Math.round(flete * porcentaje);

      try {
        const response = await fetch('/actualizar-anticipo-directo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cargaId, tipo_anticipo: valorSeleccionado, valor_anticipo: valorCalculado, flete, origen })
        });
        
        if (response.ok) {
          const data = await response.json();
          document.getElementById("valor-ant-" + cargaId).innerText = "$" + data.valor_anticipo.toLocaleString('es-CO');
          document.getElementById("retefuente-" + cargaId).innerText = "$" + data.retefuente.toLocaleString('es-CO');
          document.getElementById("reteica-" + cargaId).innerText = "$" + data.reteica.toLocaleString('es-CO');
          document.getElementById("saldo-" + cargaId).innerText = "$" + data.saldo.toLocaleString('es-CO');
        } else {
          alert("Error al actualizar anticipo");
        }
      } catch (error) { 
        console.error("Error:", error);
        alert("Error al guardar anticipo");
      }
    }

    async function actualizarEstadoFinanciero(id, nuevoEstado) {
      let fechaActualizada = null;
      if (nuevoEstado === "TRANSFERIDO") fechaActualizada = new Date().toISOString().split('T')[0];
      
      try {
        const response = await fetch('/actualizar-estado-financiero', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, estado: nuevoEstado, fechaPago: fechaActualizada })
        });
        
        if (response.ok) {
          const celdaFecha = document.getElementById("fecha-pago-" + id);
          if (celdaFecha) {
            celdaFecha.innerText = fechaActualizada || '---';
            celdaFecha.style.color = nuevoEstado === "TRANSFERIDO" ? "#10b981" : "white";
          }
        }
      } catch (error) { 
        console.error(error);
        alert("Error al actualizar estado");
      }
    }

    async function actualizarTipoCumplido(cargaId, nuevoTipo) {
      let fechaActualizada = null;
      if (nuevoTipo !== "") fechaActualizada = new Date().toISOString().split('T')[0];
      
      try {
        const response = await fetch('/actualizar-tipo-cumplido', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cargaId, tipo_cumplido: nuevoTipo, fecha_virtual: fechaActualizada })
        });
        
        if (response.ok) {
          const celdaFecha = document.getElementById("fecha-virtual-" + cargaId);
          if (celdaFecha) {
            celdaFecha.innerText = fechaActualizada || '---';
            celdaFecha.style.color = "#10b981";
          }
        }
      } catch (e) { 
        console.error("Error:", e);
        alert("Error al actualizar tipo cumplido");
      }
    }

    async function formatToMoney(cargaId, input) {
      let numValue = input.value || 0;
      input.type = 'text';
      input.value = '$' + Number(numValue).toLocaleString('es-CO');
      await actualizarEntrega(cargaId, 'sobre_anticipo', numValue);
    }

    async function formatToMoneyDesc(cargaId, input) {
      let numValue = input.value || 0;
      input.type = 'text';
      input.value = '$' + Number(numValue).toLocaleString('es-CO');
      await actualizarEntrega(cargaId, 'valor_descuento', numValue);
    }

    async function gestionarNovedad(cargaId, valor) {
      const divObs = document.getElementById("obs-" + cargaId);
      const inputDesc = document.getElementById("input-desc-" + cargaId);
      const spanDesc = document.getElementById("span-desc-" + cargaId);
      
      if(valor === "SI") {
        divObs.contentEditable = "true";
        divObs.innerText = "";
        divObs.style.border = "1px solid #3b82f6";
        inputDesc.style.display = "inline-block";
        spanDesc.style.display = "none";
      } else {
        divObs.contentEditable = "false";
        divObs.innerText = "---";
        divObs.style.border = "none";
        inputDesc.style.display = "none";
        spanDesc.style.display = "inline-block";
        inputDesc.value = "$0";
        await actualizarEntrega(cargaId, 'valor_descuento', 0);
        await actualizarEntrega(cargaId, 'obs_novedad', '');
      }
      await actualizarEntrega(cargaId, 'presenta_novedades', valor);
    }

    async function actualizarEstadoFinal(cargaId, nuevoEstado) {
      try {
        const response = await fetch('/actualizar-entrega', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cargaId, campo: 'estado_final', valor: nuevoEstado })
        });
        if (response.ok) location.reload();
      } catch (e) { 
        console.error("Error:", e);
        alert("Error al actualizar estado final");
      }
    }

    document.getElementById('buscador').addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      document.querySelectorAll('.fila-carga').forEach(fila => {
        fila.style.display = fila.getAttribute('data-placa').includes(term) ? '' : 'none';
      });
    });
  `;
}

// ============================================
// API ROUTES - ACTUALIZACIÓN
// ============================================

app.post('/actualizar-entrega', async (req, res) => {
  try {
    const { cargaId, campo, valor } = req.body;

    // Validación
    if (!cargaId || !campo) {
      return res.status(400).json({ error: 'cargaId y campo son requeridos' });
    }

    // Lista blanca de campos permitidos
    const camposPermitidos = [
      'v_flete', 'v_facturar', 'est_pago', 'tipo_anticipo', 'valor_anticipo',
      'sobre_anticipo', 'estado_ant', 'fecha_pago_ant', 'tipo_cumplido',
      'fecha_cump_virtual', 'ent_manifiesto', 'ent_remesa', 'ent_hoja_tiempos',
      'ent_docs_cliente', 'ent_facturas', 'ent_tirilla_vacio', 'ent_tiq_cargue',
      'ent_tiq_descargue', 'presenta_novedades', 'obs_novedad', 'valor_descuento',
      'fecha_cump_docs', 'fecha_legalizacion', 'retefuente', 'reteica',
      'saldo_a_pagar', 'estado_final', 'dias_sin_pagar', 'dias_sin_cumplir'
    ];

    if (!camposPermitidos.includes(campo)) {
      return res.status(400).json({ error: 'Campo no permitido' });
    }

    await Finanza.upsert({ cargaId, [campo]: valor });
    res.json({ success: true, message: 'Actualizado correctamente' });

  } catch (error) {
    console.error('Error en POST /actualizar-entrega:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/actualizar-estado-financiero', async (req, res) => {
  try {
    const { id, estado, fechaPago } = req.body;

    if (!id || !estado) {
      return res.status(400).json({ error: 'id y estado son requeridos' });
    }

    const estadosValidos = ['PENDIENTE', 'TRANSFERIDO'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: 'Estado no válido' });
    }

    await Finanza.upsert({ cargaId: id, est_pago: estado, fecha_pago_ant: fechaPago });
    res.json({ success: true, message: 'Estado actualizado' });

  } catch (error) {
    console.error('Error en POST /actualizar-estado-financiero:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/actualizar-anticipo-directo', async (req, res) => {
  try {
    const { cargaId, tipo_anticipo, valor_anticipo, flete, origen } = req.body;

    if (!cargaId || !flete) {
      return res.status(400).json({ error: 'cargaId y flete son requeridos' });
    }

    // FÓRMULAS ORIGINALES PRESERVADAS
    const retefuente = calcularRetefuente(flete);
    const reteica = calcularReteICA(flete, origen);
    
    const finanza = await Finanza.findOne({ where: { cargaId } });
    const sobreAnticipo = Number(finanza?.sobre_anticipo || 0);
    const descuento = Number(finanza?.valor_descuento || 0);
    
    const saldo = calcularSaldo(flete, retefuente, reteica, valor_anticipo, sobreAnticipo, descuento);

    await Finanza.upsert({ 
      cargaId, 
      tipo_anticipo, 
      valor_anticipo, 
      retefuente, 
      reteica, 
      saldo_a_pagar: saldo 
    });

    res.json({ 
      success: true,
      valor_anticipo: valor_anticipo,
      retefuente, 
      reteica, 
      saldo 
    });

  } catch (error) {
    console.error('Error en POST /actualizar-anticipo-directo:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/actualizar-tipo-cumplido', async (req, res) => {
  try {
    const { cargaId, tipo_cumplido, fecha_virtual } = req.body;

    if (!cargaId) {
      return res.status(400).json({ error: 'cargaId es requerido' });
    }

    const tiposValidos = ['', 'VIRTUAL', 'FÍSICO'];
    if (!tiposValidos.includes(tipo_cumplido)) {
      return res.status(400).json({ error: 'Tipo de cumplido no válido' });
    }

    await Finanza.upsert({ cargaId, tipo_cumplido, fecha_cump_virtual: fecha_virtual });
    res.json({ success: true, message: 'Tipo cumplido actualizado' });

  } catch (error) {
    console.error('Error en POST /actualizar-tipo-cumplido:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// FORMULARIO DE EDICIÓN
// ============================================

app.get('/editar/:id', async (req, res) => {
  try {
    const cargaId = parseInt(req.params.id);
    
    if (isNaN(cargaId)) {
      return res.status(400).send('<h2>ID de carga no válido</h2>');
    }

    const [finanza] = await Finanza.findOrCreate({ where: { cargaId } });

    const formHtml = generarFormularioEdicion(cargaId, finanza);
    res.send(formHtml);

  } catch (err) {
    console.error('Error en GET /editar/:id:', err);
    res.status(500).send(`<h2>Error: ${escapeHtml(err.message)}</h2>`);
  }
});

/**
 * Genera formulario de edición
 */
function generarFormularioEdicion(cargaId, finanza) {
  const opcionesAnticipo = Object.keys(ANTICIPOS).map(tipo => 
    `<option value="${tipo}" ${finanza.tipo_anticipo === tipo ? 'selected' : ''}>${tipo}</option>`
  ).join('');

  return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Editar Carga</title>
    </head>
    <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding: 20px;">
      <div style="max-width:1000px; margin:auto; background:#1e293b; padding:30px; border-radius:12px; border:1px solid #3b82f6;">
        <h2 style="color:#3b82f6; text-align: center; margin-bottom:25px;">GESTIÓN INTEGRAL CARGA #${cargaId}</h2>
        
        <form action="/guardar/${cargaId}" method="POST" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
          <div>
            <label>FLETE PAGAR</label>
            <input type="number" name="v_flete" value="${finanza.v_flete}" step="0.01" 
                   style="width:100%; padding:8px; background:#0f172a; color:#10b981; border:1px solid #334155;">
          </div>

          <div>
            <label>FLETE FACTURAR</label>
            <input type="number" name="v_facturar" value="${finanza.v_facturar}" step="0.01" 
                   style="width:100%; padding:8px; background:#0f172a; color:#3b82f6; border:1px solid #334155;">
          </div>

          <div>
            <label>Tipo de Anticipo:</label>
            <select name="tipo_anticipo" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;">
              <option value="">Seleccione una opción...</option>
              ${opcionesAnticipo}
            </select>
          </div>

          <div>
            <label>VALOR ANTICIPO</label>
            <input type="number" name="valor_anticipo" value="${finanza.valor_anticipo}" 
                   style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;">
          </div>

          <div>
            <label>SOBRE ANTICIPO</label>
            <input type="number" name="sobre_anticipo" value="${finanza.sobre_anticipo}" 
                   style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;">
          </div>

          <div>
            <label>FECHA PAGO ANT</label>
            <input type="date" name="fecha_pago_ant" value="${finanza.fecha_pago_ant || ''}" 
                   style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;">
          </div>

          <div style="grid-column: span 3; background: #0f172a; padding: 15px; border-radius: 8px; border: 1px solid #334155;">
            <p style="margin:0 0 10px; color:#3b82f6; font-weight:bold;">CONTROL DE DOCUMENTOS</p>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; font-size: 11px;">
              <label>MANIFIESTO
                <select name="ent_manifiesto" style="width:100%; background:#1e293b; color:white; border:1px solid #334155;">
                  <option value="SI" ${finanza.ent_manifiesto === 'SI' ? 'selected' : ''}>SI</option>
                  <option value="NO" ${finanza.ent_manifiesto === 'NO' ? 'selected' : ''}>NO</option>
                </select>
              </label>
              <label>REMESA
                <select name="ent_remesa" style="width:100%; background:#1e293b; color:white; border:1px solid #334155;">
                  <option value="SI" ${finanza.ent_remesa === 'SI' ? 'selected' : ''}>SI</option>
                  <option value="NO" ${finanza.ent_remesa === 'NO' ? 'selected' : ''}>NO</option>
                </select>
              </label>
              <label>HOJA DE TIEMPOS
                <select name="ent_hoja_tiempos" style="width:100%; background:#1e293b; color:white; border:1px solid #334155;">
                  <option value="SI" ${finanza.ent_hoja_tiempos === 'SI' ? 'selected' : ''}>SI</option>
                  <option value="NO" ${finanza.ent_hoja_tiempos === 'NO' ? 'selected' : ''}>NO</option>
                </select>
              </label>
              <label>DOCUMENTOS CLIENTE
                <select name="ent_docs_cliente" style="width:100%; background:#1e293b; color:white; border:1px solid #334155;">
                  <option value="SI" ${finanza.ent_docs_cliente === 'SI' ? 'selected' : ''}>SI</option>
                  <option value="NO" ${finanza.ent_docs_cliente === 'NO' ? 'selected' : ''}>NO</option>
                </select>
              </label>
            </div>
          </div>

          <div style="grid-column: span 3; text-align: center; gap: 10px; display: flex;">
            <button type="submit" style="flex: 1; padding: 10px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
              GUARDAR
            </button>
            <a href="/" style="flex: 1; padding: 10px; background: #3b82f6; color: white; text-decoration: none; text-align: center; border-radius: 4px; font-weight: bold;">
              VOLVER
            </a>
          </div>
        </form>
      </div>
    </body>
    </html>`;
}

// ============================================
// INICIALIZACIÓN DEL SERVIDOR
// ============================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor YEGO Sistema Contable ejecutándose en puerto ${PORT}`);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('Rechazo no manejado en:', promise, 'razón:', reason);
});
