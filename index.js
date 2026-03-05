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

// MODELO COMPLETO CON LOS 30+ CAMPOS
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

      const tdStyle = `padding: 10px; text-align: center; border-right: 1px solid #334155; white-space: nowrap;`;
      const selStyle = `background: #0f172a; color: white; border: 1px solid #334155; border-radius: 4px; font-size: 10px; padding: 2px; cursor: pointer; width: 100%;`;

      const tieneNovedad = f.presenta_novedades === 'SI';
      const obsEditableStyle = tieneNovedad 
        ? `background: #1e293b; color: white; border: 1px solid #3b82f6; cursor: text;` 
        : `background: transparent; color: #475569; border: 1px solid transparent; cursor: not-allowed;`;

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
    onchange="actualizarAnticipoRapido(${c.id}, this.value, ${fletePagar})" 
    style="${selStyle}">
    <option value="" ${!f.tipo_anticipo ? 'selected' : ''}>---</option>
    <option value="Sin anticipo (0%)" ${f.tipo_anticipo === 'Sin anticipo (0%)' ? 'selected' : ''}>0%</option>
    <option value="Anticipo medio (50%)" ${f.tipo_anticipo === 'Anticipo medio (50%)' ? 'selected' : ''}>50%</option>
    <option value="Anticipo parcial (60%)" ${f.tipo_anticipo === 'Anticipo parcial (60%)' ? 'selected' : ''}>60%</option>
    <option value="Anticipo parcial (65%)" ${f.tipo_anticipo === 'Anticipo parcial (65%)' ? 'selected' : ''}>65%</option>
    <option value="Anticipo normal (70%)" ${f.tipo_anticipo === 'Anticipo normal (70%)' ? 'selected' : ''}>70%</option>
    <option value="Anticipo parcial (75%)" ${f.tipo_anticipo === 'Anticipo parcial (75%)' ? 'selected' : ''}>75%</option>
    <option value="Anticipo total (100%)" ${f.tipo_anticipo === 'Anticipo total (100%)' ? 'selected' : ''}>100%</option>
  </select>
</td>
          <td id="valor-ant-${c.id}" style="${tdStyle}">$${Number(f.valor_anticipo || 0).toLocaleString('es-CO')}</td>
          <td style="${tdStyle}">$${Number(f.sobre_anticipo || 0).toLocaleString('es-CO')}</td>
          <td style="${tdStyle}">
            <select onchange="actualizarEstadoFinanciero(${c.id}, this.value)" style="${selStyle}">
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
          <td id="fecha-virtual-${c.id}" style="${tdStyle}">${f.fecha_cump_virtual || '---'}</td>
          
          <td style="${tdStyle}"><select onchange="actualizarEntrega(${c.id}, 'ent_manifiesto', this.value)" style="${selStyle}"><option value="SI" ${f.ent_manifiesto==='SI'?'selected':''}>SI</option><option value="NO" ${f.ent_manifiesto!=='SI'?'selected':''}>NO</option><option value="NO APLICA" ${f.ent_manifiesto==='NO APLICA'?'selected':''}>N/A</option></select></td>
          <td style="${tdStyle}"><select onchange="actualizarEntrega(${c.id}, 'ent_remesa', this.value)" style="${selStyle}"><option value="SI" ${f.ent_remesa==='SI'?'selected':''}>SI</option><option value="NO" ${f.ent_remesa!=='SI'?'selected':''}>NO</option><option value="NO APLICA" ${f.ent_remesa==='NO APLICA'?'selected':''}>N/A</option></select></td>
          <td style="${tdStyle}"><select onchange="actualizarEntrega(${c.id}, 'ent_hoja_tiempos', this.value)" style="${selStyle}"><option value="SI" ${f.ent_hoja_tiempos==='SI'?'selected':''}>SI</option><option value="NO" ${f.ent_hoja_tiempos!=='SI'?'selected':''}>NO</option><option value="NO APLICA" ${f.ent_hoja_tiempos==='NO APLICA'?'selected':''}>N/A</option></select></td>
          <td style="${tdStyle}"><select onchange="actualizarEntrega(${c.id}, 'ent_docs_cliente', this.value)" style="${selStyle}"><option value="SI" ${f.ent_docs_cliente==='SI'?'selected':''}>SI</option><option value="NO" ${f.ent_docs_cliente!=='SI'?'selected':''}>NO</option><option value="NO APLICA" ${f.ent_docs_cliente==='NO APLICA'?'selected':''}>N/A</option></select></td>
          <td style="${tdStyle}"><select onchange="actualizarEntrega(${c.id}, 'ent_facturas', this.value)" style="${selStyle}"><option value="SI" ${f.ent_facturas==='SI'?'selected':''}>SI</option><option value="NO" ${f.ent_facturas!=='SI'?'selected':''}>NO</option><option value="NO APLICA" ${f.ent_facturas==='NO APLICA'?'selected':''}>N/A</option></select></td>
          <td style="${tdStyle}"><select onchange="actualizarEntrega(${c.id}, 'ent_tirilla_vacio', this.value)" style="${selStyle}"><option value="SI" ${f.ent_tirilla_vacio==='SI'?'selected':''}>SI</option><option value="NO" ${f.ent_tirilla_vacio!=='SI'?'selected':''}>NO</option><option value="NO APLICA" ${f.ent_tirilla_vacio==='NO APLICA'?'selected':''}>N/A</option></select></td>
          <td style="${tdStyle}"><select onchange="actualizarEntrega(${c.id}, 'ent_tiq_cargue', this.value)" style="${selStyle}"><option value="SI" ${f.ent_tiq_cargue==='SI'?'selected':''}>SI</option><option value="NO" ${f.ent_tiq_cargue!=='SI'?'selected':''}>NO</option><option value="NO APLICA" ${f.ent_tiq_cargue==='NO APLICA'?'selected':''}>N/A</option></select></td>
          <td style="${tdStyle}"><select onchange="actualizarEntrega(${c.id}, 'ent_tiq_descargue', this.value)" style="${selStyle}"><option value="SI" ${f.ent_tiq_descargue==='SI'?'selected':''}>SI</option><option value="NO" ${f.ent_tiq_descargue!=='SI'?'selected':''}>NO</option><option value="NO APLICA" ${f.ent_tiq_descargue==='NO APLICA'?'selected':''}>N/A</option></select></td>
          
          <td style="${tdStyle}">
            <select onchange="gestionarNovedad(${c.id}, this.value)" style="${selStyle}">
              <option value="SI" ${f.presenta_novedades==='SI'?'selected':''}>SI</option>
              <option value="NO" ${f.presenta_novedades!=='SI'?'selected':''}>NO</option>
            </select>
          </td>
          <td id="obs-novedad-${c.id}" 
              contenteditable="${tieneNovedad}" 
              onblur="guardarObsDirecto(${c.id}, this.innerText)"
              style="${tdStyle} ${obsEditableStyle} min-width: 150px; border-radius: 4px;">
              ${tieneNovedad ? (f.obs_novedad || '') : '---'}
          </td>
          <td style="${tdStyle} color: #ef4444;">$${Number(f.valor_descuento || 0).toLocaleString('es-CO')}</td>
          <td style="${tdStyle}">${f.fecha_cump_docs || '---'}</td>
          <td style="${tdStyle}">${f.fecha_legalizacion || '---'}</td>
          <td style="${tdStyle}">$${Number(f.retefuente || 0).toLocaleString('es-CO')}</td>
          <td style="${tdStyle}">$${Number(f.reteica || 0).toLocaleString('es-CO')}</td>
          <td style="${tdStyle} background: rgba(16, 185, 129, 0.1); font-weight: bold; color: #10b981;">$${Number(f.saldo_a_pagar || 0).toLocaleString('es-CO')}</td>
          <td style="${tdStyle}">${f.estado_final || '---'}</td>
          <td style="${tdStyle} color: #ef4444;">${f.dias_sin_pagar || 0}</td>
          <td style="${tdStyle} color: #3b82f6;">${f.dias_sin_cumplir || 0}</td>
          <td style="padding: 10px; text-align: center;">
            <a href="/editar/${c.id}" style="color: #3b82f6; text-decoration: none; font-weight: bold;">[LIQUIDAR]</a>
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
                <th style="${thStyle}">SOBRE ANTICIPO</th><th style="${thStyle}">ESTADO CONTABLE</th>
                <th style="${thStyle}">FECHA PAGO ANTICIPO</th><th style="${thStyle}">TIPO DE CUMPLIDO</th>
                <th style="${thStyle}">FECHA CUMPLIDO VIRTUAL</th>
                <th style="${thStyle}">MANIFIESTO</th><th style="${thStyle}">REMESA</th>
                <th style="${thStyle}">HOJA TIEMPOS</th><th style="${thStyle}">DOCS CLIENTE</th>
                <th style="${thStyle}">FACTURAS</th><th style="${thStyle}">TIRILLA VACÍO</th>
                <th style="${thStyle}">TIQ. CARGUE</th><th style="${thStyle}">TIQ. DESCARGUE</th>
                <th style="${thStyle}">¿NOVEDADES?</th><th style="${thStyle}">OBSERVACION NOVEDAD</th>
                <th style="${thStyle}">VALOR DESCUENTO</th><th style="${thStyle}">FECHA CUMP DOCS</th>
                <th style="${thStyle}">FECHA LEGALIZACIÓN</th><th style="${thStyle}">RETEFUENTE</th>
                <th style="${thStyle}">RETEICA</th><th style="${thStyle}">SALDO A PAGAR</th>
                <th style="${thStyle}">ESTADO FINAL</th><th style="${thStyle}">DÍAS SIN PAGAR</th>
                <th style="${thStyle}">DÍAS SIN CUMPLIR</th><th style="${thStyle}">ACCIÓN</th>
              </tr>
            </thead>
            <tbody id="tabla-cargas">${filas}</tbody>
          </table>
        </div>
        
        <script>
          async function gestionarNovedad(cargaId, valor) {
              const tdObs = document.getElementById('obs-novedad-' + cargaId);
              if (valor === 'SI') {
                  tdObs.contentEditable = "true";
                  tdObs.innerText = "";
                  tdObs.style.background = "#1e293b";
                  tdObs.style.border = "1px solid #3b82f6";
                  tdObs.style.color = "white";
                  tdObs.style.cursor = "text";
                  tdObs.focus();
              } else {
                  tdObs.contentEditable = "false";
                  tdObs.innerText = "---";
                  tdObs.style.background = "transparent";
                  tdObs.style.border = "1px solid transparent";
                  tdObs.style.color = "#475569";
                  tdObs.style.cursor = "not-allowed";
                  await guardarObsDirecto(cargaId, "");
              }
              await actualizarEntrega(cargaId, 'presenta_novedades', valor);
          }

          async function guardarObsDirecto(cargaId, texto) {
              await actualizarEntrega(cargaId, 'obs_novedad', texto);
          }

          async function actualizarAnticipoRapido(cargaId, valorSeleccionado, flete) {
    if (!valorSeleccionado) return;

    let porcentaje = 0;
    // Busca cualquier número que esté antes de un % (ej: 65, 70, 50)
    const match = valorSeleccionado.match(/(\d+)%/);
    
    if (match) {
        porcentaje = parseInt(match[1]) / 100;
    } else if (valorSeleccionado.includes("TOTAL")) {
        porcentaje = 1.0;
    }

    const valorCalculado = Math.round(flete * porcentaje);
    
    // Actualización visual inmediata antes de enviar al servidor
    const celdaValor = document.getElementById(`valor-ant-${cargaId}`);
    if (celdaValor) {
        celdaValor.innerText = '$' + valorCalculado.toLocaleString('es-CO');
    }

    try {
        const response = await fetch('/actualizar-anticipo-directo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                cargaId: cargaId, 
                tipo_anticipo: valorSeleccionado, 
                valor_anticipo: valorCalculado 
            })
        });
        
        if (!response.ok) throw new Error("Error en servidor");
        
        // Opcional: recargar después de un segundo para asegurar sincronía
        setTimeout(() => location.reload(), 1000); 
    } catch (e) { 
        console.error("Error al guardar:", e);
        alert("No se pudo guardar el anticipo");
    }
}

          async function actualizarEstadoFinanciero(id, nuevoEstado) {
              let fecha = nuevoEstado === "TRANSFERIDO" ? new Date().toISOString().split('T')[0] : null;
              try {
                  await fetch('/actualizar-estado-financiero', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id, estado: nuevoEstado, fechaPago: fecha })
                  });
                  location.reload();
              } catch (e) { console.error(e); }
          }

          async function actualizarTipoCumplido(cargaId, nuevoTipo) {
              let fecha = nuevoTipo !== "" ? new Date().toISOString().split('T')[0] : null;
              try {
                  await fetch('/actualizar-tipo-cumplido', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ cargaId, tipo_cumplido: nuevoTipo, fecha_virtual: fecha })
                  });
                  location.reload();
              } catch (e) { console.error(e); }
          }

          async function actualizarEntrega(cargaId, campo, valor) {
              try {
                  await fetch('/actualizar-entrega', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ cargaId, campo, valor })
                  });
              } catch (e) { console.error(e); }
          }

          document.getElementById('buscador').addEventListener('input', (e) => {
              const term = e.target.value.toLowerCase();
              document.querySelectorAll('.fila-carga').forEach(fila => {
                  fila.style.display = fila.getAttribute('data-placa').includes(term) ? '' : 'none';
              });
          });
        </script>
      </body>`);
  } catch (err) { res.status(500).send("Error: " + err.message); }
});

// RUTAS DE ACTUALIZACIÓN (POST)
app.post('/actualizar-estado-financiero', async (req, res) => {
  try {
    const { id, estado, fechaPago } = req.body;
    await Finanza.upsert({ cargaId: id, est_pago: estado, fecha_pago_ant: fechaPago });
    res.sendStatus(200);
  } catch (error) { res.status(500).send(error.message); }
});

app.post('/actualizar-anticipo-directo', async (req, res) => {
  try {
    const { cargaId, tipo_anticipo, valor_anticipo } = req.body;
    await Finanza.upsert({ cargaId, tipo_anticipo, valor_anticipo });
    res.sendStatus(200);
  } catch (error) { res.status(500).send(error.message); }
});

app.post('/actualizar-tipo-cumplido', async (req, res) => {
  try {
    const { cargaId, tipo_cumplido, fecha_virtual } = req.body;
    await Finanza.upsert({ cargaId, tipo_cumplido, fecha_cump_virtual: fecha_virtual });
    res.sendStatus(200);
  } catch (error) { res.status(500).send(error.message); }
});

app.post('/actualizar-entrega', async (req, res) => {
  try {
    const { cargaId, campo, valor } = req.body;
    await Finanza.upsert({ cargaId, [campo]: valor });
    res.sendStatus(200);
  } catch (error) { res.status(500).send(error.message); }
});

// RUTA EDITAR (FORMULARIO)
app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding: 20px;">
      <div style="max-width:1000px; margin:auto; background:#1e293b; padding:30px; border-radius:12px; border:1px solid #3b82f6;">
        <h2 style="color:#3b82f6; text-align: center; margin-bottom:25px;">GESTIÓN INTEGRAL CARGA #${req.params.id}</h2>
        <form action="/guardar/${req.params.id}" method="POST" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
          <div><label>FLETE PAGAR</label><input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%; padding:8px; background:#0f172a; color:#10b981; border:1px solid #334155;"></div>
          <div><label>FLETE FACTURAR</label><input type="number" name="v_facturar" value="${f.v_facturar}" step="0.01" style="width:100%; padding:8px; background:#0f172a; color:#3b82f6; border:1px solid #334155;"></div>
          <div><label>VALOR ANTICIPO</label><input type="number" name="valor_anticipo" value="${f.valor_anticipo}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>
          <div><label>SOBRE ANTICIPO</label><input type="number" name="sobre_anticipo" value="${f.sobre_anticipo}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>
          <div><label>RETEFUENTE</label><input type="number" name="retefuente" value="${f.retefuente}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>
          <div><label>RETEICA</label><input type="number" name="reteica" value="${f.reteica}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>
          <button type="submit" style="grid-column: span 3; padding:15px; background:#3b82f6; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">ACTUALIZAR DATOS</button>
        </form>
        <p style="text-align:center;"><a href="/" style="color:#94a3b8; text-decoration:none;">← Volver al listado</a></p>
      </div>
    </body>`);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync({ alter: true }).then(() => app.listen(PORT, () => console.log('🚀 YEGO GRID COMPLETO')));
