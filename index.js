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
  dias_sin_cumplir: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { tableName: 'Yego_Finanzas' });

// Función auxiliar para el cambio de estado visual (Chulo/X)
const statusCheck = (val) => {
  if (val === 'SI') return '<span style="color: #10b981;">✅ SI</span>';
  if (val === 'NO') return '<span style="color: #ef4444;">❌ NO</span>';
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

      const tdStyle = `padding: 10px; text-align: center; border-right: 1px solid #334155; white-space: nowrap;`;

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
              style="background: #0f172a; color: white; border: 1px solid #334155; border-radius: 4px; font-size: 10px; padding: 2px; cursor: pointer;">
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
          <td style="${tdStyle}">$${Number(f.sobre_anticipo || 0).toLocaleString('es-CO')}</td>
          <td style="${tdStyle}">
            <select 
                onchange="actualizarEstadoFinanciero(${c.id}, this.value)"
                style="background: #0f172a; color: white; border: 1px solid #334155; border-radius: 4px; font-size: 10px; padding: 2px; cursor: pointer; width: 100%;">
                <option value="PENDIENTE" ${estadoContable === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
                <option value="TRANSFERIDO" ${estadoContable === 'TRANSFERIDO' ? 'selected' : ''}>TRANSFERIDO</option>
            </select>
          </td>
          <td id="fecha-pago-${c.id}" style="${tdStyle}">${f.fecha_pago_ant || '---'}</td>
          <td style="${tdStyle}">${f.tipo_cumplido || '---'}</td>
          <option value="VIRTUAL" ${tipocumplido === 'VIRTUAL' ? 'selected' : ''}>VIRTUAL</option>
                <option value="FÍSICO" ${tipocumplido === 'FÍSICO' ? 'selected' : ''}>FÍSICO</option>
          <td style="${tdStyle}">${f.fecha_cump_virtual || '---'}</td>
          <td style="${tdStyle}">${statusCheck(f.ent_manifiesto || 'NO')}</td>
          <td style="${tdStyle}">${statusCheck(f.ent_remesa || 'NO')}</td>
          <td style="${tdStyle}">${statusCheck(f.ent_hoja_tiempos || 'NO')}</td>
          <td style="${tdStyle}">${statusCheck(f.ent_docs_cliente || 'NO')}</td>
          <td style="${tdStyle}">${statusCheck(f.ent_facturas || 'NO')}</td>
          <td style="${tdStyle}">${statusCheck(f.ent_tirilla_vacio || 'NO')}</td>
          <td style="${tdStyle}">${statusCheck(f.ent_tiq_cargue || 'NO')}</td>
          <td style="${tdStyle}">${statusCheck(f.ent_tiq_descargue || 'NO')}</td>
          <td style="${tdStyle}">${statusCheck(f.presenta_novedades || 'NO')}</td>
          <td style="${tdStyle}">${f.obs_novedad || '---'}</td>
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
                <th style="${thStyle}">SALDO A PAGAR</th><th style="${thStyle}">ESTADO</th>
                <th style="${thStyle}">DÍAS SIN PAGAR</th><th style="${thStyle}">DÍAS SIN CUMPLIR</th>
                <th style="${thStyle}">ACCIÓN</th>
              </tr>
            </thead>
            <tbody id="tabla-cargas">${filas}</tbody>
          </table>
        </div>
        
        <script>
          async function actualizarAnticipoRapido(cargaId, valorSeleccionado, flete) {
    // 1. Calcular el porcentaje basado en el texto del <option>
    let porcentaje = 0;
    if (valorSeleccionado.includes("70%")) porcentaje = 0.70;
    else if (valorSeleccionado.includes("65%")) porcentaje = 0.65;
    else if (valorSeleccionado.includes("50%")) porcentaje = 0.50;
    else if (valorSeleccionado.includes("60%")) porcentaje = 0.60;
    else if (valorSeleccionado.includes("75%")) porcentaje = 0.75;
    else if (valorSeleccionado.includes("100%")) porcentaje = 1;
    

    const valorCalculado = Math.round(flete * porcentaje);
    
    try {
        // 2. Enviar al servidor para que se guarde en la DB
        const response = await fetch('/actualizar-anticipo-directo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                cargaId, 
                tipo_anticipo: valorSeleccionado, 
                valor_anticipo: valorCalculado 
            })
        });

        // 3. Si el servidor respondió OK, actualizar la celda de la tabla inmediatamente
        if (response.ok) {
            const celdaValor = document.getElementById("valor-ant-" + cargaId);
            if (celdaValor) {
                celdaValor.innerText = "$" + valorCalculado.toLocaleString('es-CO');
                // Opcional: un pequeño destello verde para indicar éxito
                celdaValor.style.color = "#10b981"; 
            }
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
        </script>
      </body>`);
  } catch (err) { res.status(500).send("Error: " + err.message); }
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
    const { cargaId, tipo_anticipo, valor_anticipo } = req.body;
    await Finanza.upsert({ cargaId, tipo_anticipo, valor_anticipo });
    res.sendStatus(200);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding: 20px;">
      <div style="max-width:1000px; margin:auto; background:#1e293b; padding:30px; border-radius:12px; border:1px solid #3b82f6;">
        <h2 style="color:#3b82f6; text-align: center; margin-bottom:25px;">GESTIÓN INTEGRAL CARGA #${req.params.id}</h2>
        <form action="/guardar/${req.params.id}" method="POST" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
          <div><label>FLETE PAGAR</label><input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%; padding:8px; background:#0f172a; color:#10b981; border:1px solid #334155;"></div>
          <div><label>FLETE FACTURAR</label><input type="number" name="v_facturar" value="${f.v_facturar}" step="0.01" style="width:100%; padding:8px; background:#0f172a; color:#3b82f6; border:1px solid #334155;"></div>
          <div>
            <label>Tipo de Anticipo:</label>
            <select name="tipo_anticipo" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;">
              <option value="">Seleccione una opción...</option>
              <option value="Anticipo normal (70%)" ${f.tipo_anticipo === 'Anticipo normal (70%)' ? 'selected' : ''}>Anticipo normal (70%)</option>
              <option value="Anticipo parcial (65%)" ${f.tipo_anticipo === 'Anticipo parcial (65%)' ? 'selected' : ''}>Anticipo parcial (65%)</option>
              <option value="Anticipo medio (50%)" ${f.tipo_anticipo === 'Anticipo medio (50%)' ? 'selected' : ''}>Anticipo medio (50%)</option>
              <option value="Sin anticipo (0)" ${f.tipo_anticipo === 'Sin anticipo (0)' ? 'selected' : ''}>Sin anticipo (0)</option>
            </select>
          </div>
          <div><label>VALOR ANTICIPO</label><input type="number" name="valor_anticipo" value="${f.valor_anticipo}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>
          <div><label>SOBRE ANTICIPO</label><input type="number" name="sobre_anticipo" value="${f.sobre_anticipo}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>
          <div><label>FECHA PAGO ANT</label><input type="date" name="fecha_pago_ant" value="${f.fecha_pago_ant||''}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>
          <div style="grid-column: span 3; background: #0f172a; padding: 15px; border-radius: 8px; border: 1px solid #334155;">
             <p style="margin:0 0 10px; color:#3b82f6; font-weight:bold;">CONTROL DE DOCUMENTOS (INGRESAR SI/NO)</p>
             <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; font-size: 11px;">
                <label>MANIFIESTO <input type="text" name="ent_manifiesto" value="${f.ent_manifiesto}" style="width:100%; background:#1e293b; color:white; border:1px solid #334155;"></label>
                <label>REMESA <input type="text" name="ent_remesa" value="${f.ent_remesa}" style="width:100%; background:#1e293b; color:white; border:1px solid #334155;"></label>
                <label>HOJA TIEMPOS <input type="text" name="ent_hoja_tiempos" value="${f.ent_hoja_tiempos}" style="width:100%; background:#1e293b; color:white; border:1px solid #334155;"></label>
                <label>DOCS CLIENTE <input type="text" name="ent_docs_cliente" value="${f.ent_docs_cliente}" style="width:100%; background:#1e293b; color:white; border:1px solid #334155;"></label>
                <label>FACTURAS <input type="text" name="ent_facturas" value="${f.ent_facturas}" style="width:100%; background:#1e293b; color:white; border:1px solid #334155;"></label>
                <label>TIRILLA VACÍO <input type="text" name="ent_tirilla_vacio" value="${f.ent_tirilla_vacio}" style="width:100%; background:#1e293b; color:white; border:1px solid #334155;"></label>
                <label>TIQ. CARGUE <input type="text" name="ent_tiq_cargue" value="${f.ent_tiq_cargue}" style="width:100%; background:#1e293b; color:white; border:1px solid #334155;"></label>
                <label>TIQ. DESCARGUE <input type="text" name="ent_tiq_descargue" value="${f.ent_tiq_descargue}" style="width:100%; background:#1e293b; color:white; border:1px solid #334155;"></label>
             </div>
          </div>
          <div><label>RETEFUENTE</label><input type="number" name="retefuente" value="${f.retefuente}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>
          <div><label>RETEICA</label><input type="number" name="reteica" value="${f.reteica}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>
          <div><label>VALOR DESCUENTO</label><input type="number" name="valor_descuento" value="${f.valor_descuento}" style="width:100%; padding:8px; background:#0f172a; color:#ef4444; border:1px solid #334155;"></div>
          <div><label>SALDO FINAL A PAGAR</label><input type="number" name="saldo_a_pagar" value="${f.saldo_a_pagar}" style="width:100%; padding:8px; background:#0f172a; color:#10b981; border:1px solid #10b981; font-weight:bold;"></div>
          <div><label>DÍAS SIN PAGAR</label><input type="number" name="dias_sin_pagar" value="${f.dias_sin_pagar}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>
          <div><label>DÍAS SIN CUMPLIR</label><input type="number" name="dias_sin_cumplir" value="${f.dias_sin_cumplir}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>
          <button type="submit" style="grid-column: span 3; padding:15px; background:#3b82f6; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer; font-size:16px;">ACTUALIZAR DATOS CONTABLES</button>
        </form>
        <p style="text-align:center; margin-top:15px;"><a href="/" style="color:#94a3b8; text-decoration:none;">← Volver al listado principal</a></p>
      </div>
    </body>`);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync({ alter: true }).then(() => app.listen(PORT, () => console.log('🚀 YEGO GRID FULL NAMES')));
