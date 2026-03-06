const express = require('express');
const { Sequelize, DataTypes, QueryTypes } = require('sequelize');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

// MODELO COMPLETO CON LOS 30+ CAMPOS DE GESTIÓN
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
  dias_sin_cumplir: { type: DataTypes.INTEGER, defaultValue: 0 },
  pdf_reporte: { type: DataTypes.TEXT } // CAMPO ADICIONAL PARA EL PDF
}, { tableName: 'Yego_Finanzas' });

// Función auxiliar para el cambio de estado visual (Chulo/X)
const statusCheck = (val) => {
  if (val === 'SI') return '<span style="color: #10b981;">✅ SI</span>';
  if (val === 'NO') return '<span style="color: #ef4444;">❌ NO</span>';
  if (val === 'NO APLICA') return '<span style="color: #94a3b8;">⚠️ N/A</span>';
  return val || '---';
};

app.get('/', async (req, res) => {
  try {
    const sql = `SELECT * FROM "Cargas" WHERE placa IS NOT NULL AND placa != '' ORDER BY id DESC LIMIT 150`;
    const cargas = await db.query(sql, { type: QueryTypes.SELECT });
    const finanzas = await Finanza.findAll();

    let totalPendiente = 0;
    let filas = cargas.map(c => {
      const f = finanzas.find(fin => fin.cargaId === c.id) || {};
      const fletePagar = Number(f.v_flete) > 0 ? Number(f.v_flete) : Number(c.f_p || 0);
      const fleteFacturar = Number(f.v_facturar) > 0 ? Number(f.v_facturar) : Number(c.f_f || 0);
      const fechaRegistro = c.createdAt ? new Date(c.createdAt).toLocaleDateString('es-CO') : '---';
      const estadoContable = f.est_pago || "PENDIENTE";
      if(estadoContable === 'PENDIENTE') totalPendiente += fletePagar;

      // Cálculo de días sin pagar
      let diasCalculados = 0;
      if (f.fecha_cump_docs) {
          const fCumplido = new Date(f.fecha_cump_docs);
          const hoy = new Date();
          hoy.setHours(0,0,0,0);
          fCumplido.setHours(0,0,0,0);
          const diff = hoy - fCumplido;
          diasCalculados = Math.floor(diff / (1000 * 60 * 60 * 24));
          if (diasCalculados < 0) diasCalculados = 0;
      }

      // Cálculo de días sin cumplir
      let diasSinCumplirCalc = 0;
      let displayDiasSinCumplir = '0 días';
      let colorDiasSinCumplir = '#3b82f6';

      if (f.tipo_cumplido && f.tipo_cumplido !== "") {
          displayDiasSinCumplir = 'VIAJE CUMPLIDO';
          colorDiasSinCumplir = '#10b981';
      } else if (c.f_act) {
          try {
              let fechaString = c.f_act.replace(/-/g, '/').replace(',', '');
              if (fechaString.includes(' 24:')) {
                  fechaString = fechaString.replace(' 24:', ' 00:');
              }

              const fActualizacion = new Date(fechaString);
              const hoy = new Date();

              if (!isNaN(fActualizacion.getTime())) {
                  hoy.setHours(0, 0, 0, 0);
                  fActualizacion.setHours(0, 0, 0, 0);
                  const diff = hoy - fActualizacion;
                  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
                  displayDiasSinCumplir = (dias > 0 ? dias : 0) + " días";
              } else {
                  displayDiasSinCumplir = "0 días";
              }
          } catch (e) {
              displayDiasSinCumplir = "0 días";
          }
      } else {
          displayDiasSinCumplir = "0 días";
      }

      const tdStyle = `padding: 10px; text-align: center; border-right: 1px solid #334155; white-space: nowrap;`;
      const selStyle = `background: #0f172a; color: white; border: 1px solid #334155; border-radius: 4px; font-size: 10px; padding: 2px; cursor: pointer;`;

      const renderSelectEntrega = (campo, valorActual) => `
        <select onchange="actualizarEntrega(${c.id}, '${campo}', this.value)" style="${selStyle}">
          <option value="SI" ${valorActual === 'SI' ? 'selected' : ''}>SI</option>
          <option value="NO" ${valorActual === 'NO' ? 'selected' : ''}>NO</option>
          <option value="NO APLICA" ${valorActual === 'NO APLICA' ? 'selected' : ''}>NO APLICA</option>
        </select>
      `;

      return `
        <tr class="fila-carga" data-placa="${(c.placa || '').toLowerCase()}" style="border-bottom: 1px solid #334155; font-size: 11px;">
          <td style="${tdStyle} color: #94a3b8;">#${c.id}</td>
          <td style="${tdStyle}">${fechaRegistro}</td>
          <td style="${tdStyle}">${c.oficina || '---'}</td>
          <td style="${tdStyle}">${c.orig || '---'}</td>
          <td style="${tdStyle}">${c.dest || '---'}</td>
          <td style="${tdStyle}">${c.cli || '---'}</td>
          <td style="${tdStyle}">${c.cont || '---'}</td>
          <td style="${tdStyle}">${c.ped || '---'}</td>
          <td style="${tdStyle} background: rgba(59, 130, 246, 0.1); font-weight: bold;">${c.placa}</td>
          <td style="${tdStyle}">${c.muc || '---'}</td>
          <td style="${tdStyle} color: #10b981; font-weight: bold;">$${fletePagar.toLocaleString('es-CO')}</td>
          <td style="${tdStyle} color: #3b82f6;">$${fleteFacturar.toLocaleString('es-CO')}</td>
          <td style="${tdStyle}">${c.f_act || '---'}</td>
          <td style="${tdStyle} color: #fbbf24;">${c.est_real || '---'}</td>
          <td style="${tdStyle}">
            <select 
              onchange="actualizarAnticipoRapido(${c.id}, this.value, ${fletePagar}, '${c.orig}')" 
              style="${selStyle}">
              <option value="" ${!f.tipo_anticipo ? 'selected' : ''}>---</option>
              <option value="Sin anticipo (0)" ${f.tipo_anticipo === 'Sin anticipo (0)' ? 'selected' : ''}>0%</option>
              <option value="Anticipo medio (50%)" ${f.tipo_anticipo === 'Anticipo medio (50%)' ? 'selected' : ''}>50%</option>
              <option value="Anticipo parcial (60%)" ${f.tipo_anticipo === 'Anticipo parcial (60%)' ? 'selected' : ''}>60%</option>
              <option value="Anticipo parcial (65%)" ${f.tipo_anticipo === 'Anticipo parcial (65%)' ? 'selected' : ''}>65%</option>
              <option value="Anticipo normal (70%)" ${f.tipo_anticipo === 'Anticipo normal (70%)' ? 'selected' : ''}>70%</option>
              <option value="Anticipo parcial (75%)" ${f.tipo_anticipo === 'Anticipo parcial (75%)' ? 'selected' : ''}>75%</option>
              <option value="Anticipo parcial (100%)" ${f.tipo_anticipo === 'Anticipo parcial (100%)' ? 'selected' : ''}>100%</option>
            </select>
          </td>
          <td id="valor-ant-${c.id}" style="${tdStyle}">$${Number(f.valor_anticipo || 0).toLocaleString('es-CO')}</td>
          <td style="${tdStyle}">
            <input 
                type="text" 
                id="input-sobre-${c.id}"
                value="$${Number(f.sobre_anticipo || 0).toLocaleString('es-CO')}" 
                style="background: #0f172a; color: #fbbf24; border: 1px solid #334155; border-radius: 4px; font-size: 11px; padding: 4px; width: 100px; text-align: center; outline: none;"
                onfocus="this.type='number'; this.value='${f.sobre_anticipo || 0}'"
                onblur="formatToMoney(${c.id}, this)"
            >
            </td>
          <td style="${tdStyle}">
            <select 
                onchange="actualizarEstadoFinanciero(${c.id}, this.value)"
                style="${selStyle} width: 100%;">
                <option value="PENDIENTE" ${estadoContable === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
                <option value="TRANSFERIDO" ${estadoContable === 'TRANSFERIDO' ? 'selected' : ''}>TRANSFERIDO</option>
            </select>
          </td>
          <td id="fecha-pago-${c.id}" style="${tdStyle}">${f.fecha_pago_ant || '---'}</td>

          <td style="${tdStyle}">
            <select onchange="actualizarTipoCumplido(${c.id}, this.value)" style="${selStyle}">
              <option value="" ${!f.tipo_cumplido ? 'selected' : ''}>---</option>
              <option value="VIRTUAL" ${f.tipo_cumplido === 'VIRTUAL' ? 'selected' : ''}>VIRTUAL</option>
              <option value="FÍSICO" ${f.tipo_cumplido === 'FÍSICO' ? 'selected' : ''}>FÍSICO</option>
            </select>
          </td>

          <td id="fecha-virtual-${c.id}" style="${tdStyle}">
            ${f.fecha_cump_virtual || '---'}
          </td>
          <td style="${tdStyle}">${renderSelectEntrega('ent_manifiesto', f.ent_manifiesto)}</td>
          <td style="${tdStyle}">${renderSelectEntrega('ent_remesa', f.ent_remesa)}</td>
          <td style="${tdStyle}">${renderSelectEntrega('ent_hoja_tiempos', f.ent_hoja_tiempos)}</td>
          <td style="${tdStyle}">${renderSelectEntrega('ent_docs_cliente', f.ent_docs_cliente)}</td>
          <td style="${tdStyle}">${renderSelectEntrega('ent_facturas', f.ent_facturas)}</td>
          <td style="${tdStyle}">${renderSelectEntrega('ent_tirilla_vacio', f.ent_tirilla_vacio)}</td>
          <td style="${tdStyle}">${renderSelectEntrega('ent_tiq_cargue', f.ent_tiq_cargue)}</td>
          <td style="${tdStyle}">${renderSelectEntrega('ent_tiq_descargue', f.ent_tiq_descargue)}</td>
          <td style="${tdStyle}">
            <select onchange="gestionarNovedad(${c.id}, this.value)" style="${selStyle}">
              <option value="NO" ${f.presenta_novedades === 'NO' ? 'selected' : ''}>NO</option>
              <option value="SI" ${f.presenta_novedades === 'SI' ? 'selected' : ''}>SI</option>
            </select>
          </td>
          <td id="td-obs-${c.id}" style="${tdStyle}">
            <div id="obs-${c.id}" 
                 contenteditable="${f.presenta_novedades === 'SI'}" 
                 onblur="actualizarEntrega(${c.id}, 'obs_novedad', this.innerText)"
                 style="min-width: 100px; padding: 2px; border: ${f.presenta_novedades === 'SI' ? '1px solid #3b82f6' : 'none'}; border-radius: 4px;">
              ${f.presenta_novedades === 'SI' ? (f.obs_novedad || '') : '---'}
            </div>
          </td>
          <td id="td-descuento-${c.id}" style="${tdStyle}">
            <input 
                type="text" 
                id="input-desc-${c.id}"
                value="$${Number(f.valor_descuento || 0).toLocaleString('es-CO')}" 
                style="background: #0f172a; color: #ef4444; border: 1px solid #334155; border-radius: 4px; font-size: 11px; padding: 4px; width: 100px; text-align: center; outline: none; display: ${f.presenta_novedades === 'SI' ? 'inline-block' : 'none'};"
                onfocus="this.type='number'; this.value='${f.valor_descuento || 0}'"
                onblur="formatToMoneyDesc(${c.id}, this)"
            >
            <span id="span-desc-${c.id}" style="display: ${f.presenta_novedades === 'SI' ? 'none' : 'inline-block'};">---</span>
            </td>
          <td style="${tdStyle}">
            <input 
                type="date" 
                value="${f.fecha_cump_docs || ''}" 
                style="background: #0f172a; color: white; border: 1px solid #334155; border-radius: 4px; font-size: 11px; padding: 2px; outline: none; cursor: pointer; color-scheme: dark;"
                onchange="actualizarEntrega(${c.id}, 'fecha_cump_docs', this.value); calcularDiasSinPagar(this, 'dias-pago-${c.id}')"
            >
            </td>
            <td style="${tdStyle}">
            <input 
                type="date" 
                value="${f.fecha_legalizacion || ''}" 
                style="background: #0f172a; color: white; border: 1px solid #334155; border-radius: 4px; font-size: 11px; padding: 2px; outline: none; cursor: pointer; color-scheme: dark;"
                onchange="actualizarEntrega(${c.id}, 'fecha_legalizacion', this.value)"
            >
            </td>
          <td id="retefuente-${c.id}" style="${tdStyle}">
  $${ Math.round((Number(f.v_flete) || Number(c.f_p) || 0) * 0.01).toLocaleString('es-CO') }
</td>
          <td id="reteica-${c.id}" style="${tdStyle}">
  ${(() => {
    const fBase = Number(f.v_flete) || Number(c.f_p) || 0;
    const origen = (c.orig || '').toUpperCase();
    let tarifa = 0.01;
    if (origen.includes("BUENAVENTURA")) tarifa = 0.004;
    else if (origen.includes("CARTAGENA") || origen.includes("BARRANQUILLA") || origen.includes("SANTA MARTA")) tarifa = 0.007;
    else if (origen.includes("YUMBO") || origen.includes("FUNZA")) tarifa = 0.005;
    return '$' + Math.round(fBase * tarifa).toLocaleString('es-CO');
  })()}
</td>
          <td id="saldo-${c.id}" style="${tdStyle} background: rgba(16, 185, 129, 0.1); font-weight: bold; color: #10b981;">$${Number(f.saldo_a_pagar || 0).toLocaleString('es-CO')}</td>
<td style="${tdStyle}">
  <select 
    onchange="actualizarEstadoFinal(${c.id}, this.value)" 
    style="${selStyle} width: 100%; border: 1px solid ${f.estado_final === 'TRANSFERIDO' ? '#10b981' : '#334155'};">
    <option value="PENDIENTE" ${f.estado_final === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
    <option value="TRANSFERIDO" ${f.estado_final === 'TRANSFERIDO' ? 'selected' : ''}>TRANSFERIDO</option>
  </select>
</td>
<td id="dias-pago-${c.id}" style="${tdStyle}; color: red;">${diasCalculados} días</td>
          <td id="dias-cumplir-${c.id}" style="${tdStyle} color: ${colorDiasSinCumplir};">${displayDiasSinCumplir}</td>
          
          <td style="${tdStyle}">
            <div style="display: flex; gap: 5px; justify-content: center; align-items: center;">
              <button onclick="abrirLiquidacion(${JSON.stringify(c).replace(/"/g, '&quot;')}, ${JSON.stringify(f).replace(/"/g, '&quot;')})" style="${selStyle} color: #3b82f6; font-weight: bold; background: transparent; border: none;">[LIQUIDAR]</button>
              ${f.pdf_reporte ? 
                `<a href="data:application/pdf;base64,${f.pdf_reporte}" download="Cumplido_${c.muc}.pdf" style="${selStyle} text-decoration: none; color: #10b981; font-weight: bold;">[VER PDF]</a>` 
                : `<span style="color: #475569;">---</span>`}
            </div>
          </td>
        </tr>`;
    }).join('');

    const thStyle = `padding: 15px 10px; text-align: center; border-right: 1px solid #475569; border-bottom: 2px solid #3b82f6; white-space: nowrap;`;

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family: 'Segoe UI', sans-serif; padding:15px; margin:0;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; background: #1e293b; padding: 12px; border-radius: 8px; border: 1px solid #334155;">
          <h2 style="margin:0; color: #3b82f6;">YEGO SISTEMA CONTABLE</h2>
          <div style="text-align: right; background: rgba(239, 68, 68, 0.1); padding: 5px 15px; border-radius: 6px; border: 1px solid #ef4444;">
            <small style="color:#ef4444; font-weight: bold;">TOTAL POR PAGAR:</small><br>
            <b style="color:#f1f5f9; font-size: 20px;">$ ${totalPendiente.toLocaleString('es-CO')}</b>
          </div>
        </div>
        <input type="text" id="buscador" placeholder="🔍 Filtrar por placa..." style="width:100%; padding:12px; margin-bottom:15px; border-radius:6px; border:1px solid #334155; background:#1e293b; color:white; outline: none;">
        <div style="overflow-x: auto; border-radius: 8px; border: 1px solid #334155;">
          <table style="width:100%; border-collapse:collapse; background:#1e293b; min-width: 6500px;">
            <thead style="background:#1e40af; color: white; font-size: 10px; text-transform: uppercase;">
              <tr>
                <th style="${thStyle}">ID</th><th style="${thStyle}">FECHA REGISTRO</th><th style="${thStyle}">OFICINA</th>
                <th style="${thStyle}">ORIGEN</th><th style="${thStyle}">DESTINO</th><th style="${thStyle}">CLIENTE</th>
                <th style="${thStyle}">CONTENEDOR</th><th style="${thStyle}">PEDIDO</th><th style="${thStyle}">PLACA</th>
                <th style="${thStyle}">MUC</th><th style="${thStyle}">FLETE A PAGAR</th>
                <th style="${thStyle}">FLETE A FACTURAR</th><th style="${thStyle}">FECHA ACTUALIZACIÓN</th>
                <th style="${thStyle}">ESTADO FINAL LOGIS</th>
                <th style="${thStyle}">TIPO DE ANTICIPO</th><th style="${thStyle}">VALOR ANTICIPO</th>
                <th style="${thStyle}">SOBRE ANTICIPO</th><th style="${thStyle}">ESTADO</th>
                <th style="${thStyle}">FECHA DE PAGO ANTICIPO</th><th style="${thStyle}">TIPO DE CUMPLIDO</th>
                <th style="${thStyle}">FECHA CUMPLIDO VIRTUAL</th><th style="${thStyle}">ENTREGA DE MANIFIESTO</th>
                <th style="${thStyle}">ENTREGA DE REMESA</th><th style="${thStyle}">ENTREGA DE HOJA DE TIEMPOS</th>
                <th style="${thStyle}">ENTREGA DE DOCUMENTOS CLIENTE</th><th style="${thStyle}">ENTREGA DE FACTURAS</th>
                <th style="${thStyle}">ENTREGA DE TIRILLA CONTENEDOR VACÍO</th><th style="${thStyle}">ENTREGA DE TIQUETE DE CARGUE (GRANEL)</th>
                <th style="${thStyle}">ENTREGA DE TIQUETE DE DESCARGUE (GRANEL)</th><th style="${thStyle}">¿EL SERVICIO PRESENTA NOVEDADES?</th>
                <th style="${thStyle}">OBSERVACION NOVEDAD</th><th style="${thStyle}">VALOR DESCUENTO</th>
                <th style="${thStyle}">FECHA DE CUMPLIDO DOCUMENTOS</th><th style="${thStyle}">FECHA DE LEGALIZACIÓN</th>
                <th style="${thStyle}">RETEFUENTE</th><th style="${thStyle}">RETEICA</th>
                <th style="${thStyle}">SALDO A PAGAR</th><th style="${thStyle}">ESTADO FINAL</th>
                <th style="${thStyle}">DÍAS SIN PAGAR</th><th style="${thStyle}">DÍAS SIN CUMPLIR</th>
                <th style="${thStyle}">DOCUMENTO PDF</th>
              </tr>
            </thead>
            <tbody id="tabla-cargas">${filas}</tbody>
          </table>
        </div>

        <div id="modalLiquidacion" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:1000; justify-content:center; align-items:center;">
          <div style="background:#1e293b; width:80%; max-width:800px; padding:20px; border-radius:12px; border:1px solid #334155; position:relative; max-height:90vh; overflow-y:auto;">
            <button onclick="cerrarModal()" style="position:absolute; right:15px; top:15px; background:none; border:none; color:white; font-size:24px; cursor:pointer;">&times;</button>
            <h2 style="color:#3b82f6; border-bottom:1px solid #334155; padding-bottom:10px;">FORMATO DE LIQUIDACIÓN</h2>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-top:20px;">
              <div>
                <label style="display:block; font-size:12px; color:#94a3b8;">PLACA</label>
                <input type="text" id="form-placa" readonly style="width:100%; background:#0f172a; border:1px solid #334155; color:white; padding:8px; border-radius:4px;">
              </div>
              <div>
                <label style="display:block; font-size:12px; color:#94a3b8;">FLETE PACTADO</label>
                <input type="text" id="form-flete" readonly style="width:100%; background:#0f172a; border:1px solid #334155; color:#10b981; padding:8px; border-radius:4px; font-weight:bold;">
              </div>
              <div>
                <label style="display:block; font-size:12px; color:#94a3b8;">ORIGEN - DESTINO</label>
                <input type="text" id="form-ruta" readonly style="width:100%; background:#0f172a; border:1px solid #334155; color:white; padding:8px; border-radius:4px;">
              </div>
              <div>
                <label style="display:block; font-size:12px; color:#94a3b8;">DÍAS DE MORA</label>
                <input type="text" id="form-dias" readonly style="width:100%; background:#0f172a; border:1px solid #334155; color:#ef4444; padding:8px; border-radius:4px;">
              </div>
            </div>

            <div style="margin-top:30px; background:rgba(16, 185, 129, 0.05); padding:15px; border-radius:8px; border:1px dashed #10b981;">
              <h3 style="margin-top:0; font-size:14px; color:#10b981;">SALDO FINAL CALCULADO</h3>
              <p id="form-saldo" style="font-size:24px; font-weight:bold; margin:10px 0; color:#10b981;">$0</p>
            </div>
          </div>
        </div>
        
        <script>
        function abrirLiquidacion(c, f) {
            document.getElementById('form-placa').value = c.placa;
            document.getElementById('form-flete').value = '$' + (f.v_flete || c.f_p || 0).toLocaleString('es-CO');
            document.getElementById('form-ruta').value = (c.orig || '') + ' -> ' + (c.dest || '');
            document.getElementById('form-saldo').innerText = '$' + (f.saldo_a_pagar || 0).toLocaleString('es-CO');
            
            const diasTd = document.getElementById('dias-pago-' + c.id);
            document.getElementById('form-dias').value = diasTd ? diasTd.innerText : '0 días';

            document.getElementById('modalLiquidacion').style.display = 'flex';
        }

        function cerrarModal() {
            document.getElementById('modalLiquidacion').style.display = 'none';
        }

        function colorDias(dias) {
            if (dias > 30) return '#ef4444';
            if (dias > 15) return '#fbbf24';
            return '#10b981';
        }

        function calcularDiasSinPagar(fechaInput, celdaId) {
            if (!fechaInput.value) {
                document.getElementById(celdaId).innerText = "0 días";
                return;
            }
            const fechaSeleccionada = new Date(fechaInput.value);
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            fechaSeleccionada.setHours(0, 0, 0, 0);

            const diferenciaMs = hoy - fechaSeleccionada;
            const dias = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));
            const resultado = dias > 0 ? dias : 0;
            
            const elementoDestino = document.getElementById(celdaId);
            elementoDestino.innerText = resultado + " días";
            elementoDestino.style.color = colorDias(resultado);
        }

        async function actualizarEntrega(cargaId, campo, valor) {
          try {
            await fetch('/actualizar-entrega', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cargaId, campo, valor })
            });
          } catch (e) { console.error("Error al actualizar entrega", e); }
        }

        async function actualizarAnticipoRapido(cargaId, valorSeleccionado, flete, origen) {
          let porcentaje = 0;
          if (valorSeleccionado.includes("70%")) porcentaje = 0.70;
          else if (valorSeleccionado.includes("50%")) porcentaje = 0.50;
          else if (valorSeleccionado.includes("100%")) porcentaje = 1;

          const valorCalculado = Math.round(flete * porcentaje);
          
          try {
              const response = await fetch('/actualizar-anticipo-directo', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                      cargaId, 
                      tipo_anticipo: valorSeleccionado, 
                      valor_anticipo: valorCalculado,
                      flete: flete,
                      origen: origen
                  })
              });

              if (response.ok) {
                  const data = await response.json();
                  document.getElementById("valor-ant-" + cargaId).innerText = "$" + valorCalculado.toLocaleString('es-CO');
                  document.getElementById("retefuente-" + cargaId).innerText = "$" + data.retefuente.toLocaleString('es-CO');
                  document.getElementById("reteica-" + cargaId).innerText = "$" + data.reteica.toLocaleString('es-CO');
                  document.getElementById("saldo-" + cargaId).innerText = "$" + data.saldo.toLocaleString('es-CO');
              }
          } catch (error) { 
              console.error("Error al actualizar anticipo:", error); 
          }
        }

        async function actualizarEstadoFinanciero(id, nuevoEstado) {
          let fechaActualizada = null;
          if (nuevoEstado === "TRANSFERIDO") {
              const ahora = new Date();
              fechaActualizada = ahora.toISOString().split('T')[0];
          }
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
          } catch (error) { console.error(error); }
        }

        document.getElementById('buscador').addEventListener('input', (e) => {
          const term = e.target.value.toLowerCase();
          document.querySelectorAll('.fila-carga').forEach(fila => {
            fila.style.display = fila.getAttribute('data-placa').includes(term) ? '' : 'none';
          });
        });

        async function actualizarTipoCumplido(cargaId, nuevoTipo) {
          try {
            const response = await fetch('/actualizar-tipo-cumplido', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                cargaId, 
                tipo_cumplido: nuevoTipo
              })
            });
            if (response.ok) {
              location.reload(); 
            }
          } catch (e) { 
            console.error("Error al guardar tipo cumplido", e); 
          }
        }

        async function formatToMoney(cargaId, input) {
            let numValue = input.value.replace(/[^0-9]/g, '') || 0;
            input.type = 'text';
            input.value = '$' + Number(numValue).toLocaleString('es-CO');
            await actualizarEntrega(cargaId, 'sobre_anticipo', numValue);
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

        async function formatToMoneyDesc(cargaId, input) {
            let numValue = input.value.replace(/[^0-9]/g, '') || 0;
            input.type = 'text';
            input.value = '$' + Number(numValue).toLocaleString('es-CO');
            await actualizarEntrega(cargaId, 'valor_descuento', numValue);
        }

        async function actualizarEstadoFinal(cargaId, nuevoEstado) {
          try {
            const response = await fetch('/actualizar-entrega', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                cargaId: cargaId, 
                campo: 'estado_final', 
                valor: nuevoEstado 
              })
            });
            if (response.ok) {
               location.reload(); 
            }
          } catch (e) {
            console.error("Error:", e);
          }
        }
        </script>
      </body>`);
  } catch (err) { res.status(500).send("Error: " + err.message); }
});

app.post('/actualizar-entrega', async (req, res) => {
  try {
    const { cargaId, campo, valor } = req.body;
    await Finanza.upsert({ cargaId, [campo]: valor });
    res.sendStatus(200);
  } catch (error) { res.status(500).send(error.message); }
});

app.post('/actualizar-estado-financiero', async (req, res) => {
  try {
    const { id, estado, fechaPago } = req.body;
    await Finanza.upsert({ 
        cargaId: id, 
        est_pago: estado, 
        fecha_pago_ant: fechaPago 
    });
    res.sendStatus(200);
  } catch (error) { res.status(500).send(error.message); }
});

app.post('/actualizar-anticipo-directo', async (req, res) => {
  try {
    const { cargaId, tipo_anticipo, valor_anticipo, flete, origen } = req.body;
    const retefuente = Math.round(flete * 0.01);
    let tarifaIca = 0.007; 
    const ciudad = (origen || '').toUpperCase();
    if (ciudad.includes("BUENAVENTURA")) tarifaIca = 0.004;
    
    const reteica = Math.round(flete * tarifaIca);
    const f = await Finanza.findOne({ where: { cargaId } });
    const sobre = Number(f?.sobre_anticipo || 0);
    const desc = Number(f?.valor_descuento || 0);
    const saldo = flete - retefuente - reteica - valor_anticipo - sobre - desc;

    await Finanza.upsert({ 
        cargaId, 
        tipo_anticipo, 
        valor_anticipo,
        retefuente,
        reteica,
        saldo_a_pagar: saldo
    });

    res.json({ retefuente, reteica, saldo });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.post('/actualizar-tipo-cumplido', async (req, res) => {
  try {
    const { cargaId, tipo_cumplido } = req.body;
    const updateData = { cargaId, tipo_cumplido };
    if (tipo_cumplido !== "") {
        updateData.fecha_cump_virtual = new Date().toISOString().split('T')[0];
    }
    await Finanza.upsert(updateData);
    res.sendStatus(200);
  } catch (error) { res.status(500).send(error.message); }
});

const PORT = process.env.PORT || 3000;
db.sync({ alter: true }).then(() => {
    app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
}).catch(err => {
    console.error("Error al sincronizar DB:", err);
});
