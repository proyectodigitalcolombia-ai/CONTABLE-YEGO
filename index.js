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

// MODELO EXTENDIDO PARA GESTIÓN MANUAL (ESTRUCTURA DE LÍNEAS EXPANDIDA)
const Finanza = db.define('Finanza', {
  cargaId: { 
    type: DataTypes.INTEGER, 
    unique: true 
  },
  v_flete: { 
    type: DataTypes.DECIMAL(15, 2), 
    defaultValue: 0 
  },
  v_facturar: { 
    type: DataTypes.DECIMAL(15, 2), 
    defaultValue: 0 
  },
  est_pago: { 
    type: DataTypes.STRING, 
    defaultValue: 'PENDIENTE' 
  },
  nro_factura: { type: DataTypes.STRING },
  fecha_pago_real: { type: DataTypes.DATEONLY },
  obs_contable: { type: DataTypes.TEXT },
  referencia_soporte: { type: DataTypes.STRING },
  // NUEVOS CAMPOS MANUALES SOLICITADOS
  tipo_anticipo: { type: DataTypes.STRING },
  valor_anticipo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  sobre_anticipo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  estado_anticipo: { type: DataTypes.STRING },
  fecha_pago_anticipo: { type: DataTypes.DATEONLY },
  tipo_cumplido: { type: DataTypes.STRING },
  fecha_cumplido_virtual: { type: DataTypes.DATEONLY },
  entrega_manifiesto: { type: DataTypes.STRING, defaultValue: 'NO' },
  entrega_remesa: { type: DataTypes.STRING, defaultValue: 'NO' },
  entrega_hoja_tiempos: { type: DataTypes.STRING, defaultValue: 'NO' },
  entrega_documentos_cliente: { type: DataTypes.STRING, defaultValue: 'NO' },
  entrega_facturas: { type: DataTypes.STRING, defaultValue: 'NO' },
  entrega_tirilla_contenedor_vacio: { type: DataTypes.STRING, defaultValue: 'NO' },
  entrega_tiquete_cargue: { type: DataTypes.STRING, defaultValue: 'NO' },
  entrega_tiquete_descargue: { type: DataTypes.STRING, defaultValue: 'NO' },
  presenta_novedades: { type: DataTypes.STRING, defaultValue: 'NO' },
  observacion_novedad: { type: DataTypes.TEXT },
  valor_descuento: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  fecha_de_cumplido_documentos: { type: DataTypes.DATEONLY },
  fecha_de_legalizacion: { type: DataTypes.DATEONLY },
  retefuente: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  reteica: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  saldo_a_pagar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  estado_gestion: { type: DataTypes.STRING },
  dias_sin_pagar: { type: DataTypes.INTEGER, defaultValue: 0 },
  dias_sin_cumplir: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { 
  tableName: 'Yego_Finanzas' 
});

app.get('/', async (req, res) => {
  try {
    const sql = `SELECT * FROM "Cargas" WHERE placa IS NOT NULL AND placa != '' ORDER BY id DESC LIMIT 150`;
    const cargas = await db.query(sql, { type: QueryTypes.SELECT });
    const finanzas = await Finanza.findAll();

    let totalPagar = 0;
    let totalFacturar = 0;

    let filas = cargas.map(c => {
      const f = finanzas.find(fin => fin.cargaId === c.id) || {};
      const fletePagar = Number(f.v_flete || 0);
      const fleteFacturar = Number(f.v_facturar || 0);
      const estadoContable = f.est_pago || "PENDIENTE";
      const factura = f.nro_factura || '---';

      if(estadoContable === 'PENDIENTE') totalPagar += fletePagar;
      totalFacturar += fleteFacturar;

      const tdStyle = `padding: 8px; text-align: center; border-right: 1px solid #334155; white-space: nowrap;`;

      return `
        <tr class="fila-carga" data-placa="${(c.placa || '').toLowerCase()}" style="border-bottom: 1px solid #334155; font-size: 11px;">
          <td style="${tdStyle} color: #94a3b8;">#${c.id}</td>
          <td style="${tdStyle}">${c.f_doc || '---'}</td>
          <td style="${tdStyle}">${c.cli || '---'}</td>
          <td style="${tdStyle} font-weight: bold;">${c.placa}</td>
          <td style="${tdStyle} color: #10b981;">$${fletePagar.toLocaleString('es-CO')}</td>
          <td style="${tdStyle} color: #3b82f6;">$${fleteFacturar.toLocaleString('es-CO')}</td>
          <td style="${tdStyle}">${f.tipo_anticipo || '---'}</td>
          <td style="${tdStyle}">$${Number(f.valor_anticipo || 0).toLocaleString('es-CO')}</td>
          <td style="${tdStyle}">${f.estado_anticipo || '---'}</td>
          <td style="${tdStyle}">${f.fecha_cumplido_virtual || '---'}</td>
          <td style="${tdStyle} color: #ef4444;">$${Number(f.valor_descuento || 0).toLocaleString('es-CO')}</td>
          <td style="${tdStyle} font-weight: bold; background: #064e3b;">$${Number(f.saldo_a_pagar || 0).toLocaleString('es-CO')}</td>
          <td style="${tdStyle} color: #fbbf24; font-weight: bold;">${factura}</td>
          <td style="${tdStyle}">${f.dias_sin_pagar || 0}</td>
          <td style="${tdStyle}">${f.dias_sin_cumplir || 0}</td>
          <td style="${tdStyle} font-weight: bold; color: #fbbf24;">${c.est_real || '---'}</td>
          <td style="${tdStyle}">
            <span style="background: ${estadoContable === 'PAGADO' ? '#065f46' : '#7f1d1d'}; padding: 3px 8px; border-radius: 4px;">
              ${estadoContable}
            </span>
          </td>
          <td style="padding: 8px; text-align: center;">
            <a href="/editar/${c.id}" style="color: #3b82f6; text-decoration: none; font-weight: bold; background: rgba(59, 130, 246, 0.1); padding: 4px 8px; border-radius: 4px;">GESTIONAR</a>
          </td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family: 'Segoe UI', sans-serif; padding:15px; margin:0;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; background: #1e293b; padding: 15px; border-radius: 10px; border: 1px solid #334155;">
          <div>
            <h2 style="margin:0; color: #3b82f6;">YEGO ERP CONTABLE</h2>
          </div>
          <div style="display: flex; gap: 20px;">
            <div style="text-align: right;">
              <small style="color:#ef4444;">POR PAGAR:</small><br>
              <b style="font-size: 18px;">$ ${totalPagar.toLocaleString('es-CO')}</b>
            </div>
            <div style="text-align: right; border-left: 1px solid #334155; padding-left: 20px;">
              <small style="color:#3b82f6;">POR FACTURAR:</small><br>
              <b style="font-size: 18px;">$ ${totalFacturar.toLocaleString('es-CO')}</b>
            </div>
          </div>
        </div>
        <input type="text" id="buscador" placeholder="🔍 Buscar por placa o cliente..." style="width:100%; padding:12px; margin-bottom:15px; border-radius:8px; border:1px solid #334155; background:#1e293b; color:white;">
        <div style="overflow-x: auto; border-radius: 8px; border: 1px solid #334155;">
          <table style="width:100%; border-collapse:collapse; background:#1e293b; min-width: 2500px;">
            <thead style="background:#1e40af; font-size: 10px; text-transform: uppercase;">
              <tr>
                <th style="padding:12px;">ID</th><th>REGISTRO</th><th>CLIENTE</th><th>PLACA</th>
                <th style="background:#064e3b">V. FLETE</th><th style="background:#1e3a8a">V. FACTURA</th>
                <th>TIPO ANT.</th><th>VALOR ANT.</th><th>EST. ANT.</th><th>F. CUMP VIRT</th>
                <th style="color:#ef4444">DESC.</th><th style="background:#166534">SALDO PAGAR</th>
                <th>N° FACTURA</th><th>DÍAS MORA P.</th><th>DÍAS MORA C.</th><th>ESTADO LOG.</th><th>ESTADO PAGO</th><th>GESTIÓN</th>
              </tr>
            </thead>
            <tbody id="tabla-cargas">${filas}</tbody>
          </table>
        </div>
        <script>
          document.getElementById('buscador').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.fila-carga').forEach(fila => {
              fila.style.display = fila.innerText.toLowerCase().includes(term) ? '' : 'none';
            });
          });
        </script>
      </body>`);
  } catch (err) { res.status(500).send("Error: " + err.message); }
});

app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:20px;">
      <div style="max-width:1000px; margin:auto; background:#1e293b; padding:30px; border-radius:15px; border:1px solid #3b82f6;">
        <h2 style="color:#3b82f6; text-align:center; border-bottom: 1px solid #334155; padding-bottom:10px;">Gestión Manual #${req.params.id}</h2>
        <form action="/guardar/${req.params.id}" method="POST" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
          <div><label style="font-size:11px;">TIPO ANTICIPO</label><input type="text" name="tipo_anticipo" value="${f.tipo_anticipo||''}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>
          <div><label style="font-size:11px;">VALOR ANTICIPO</label><input type="number" name="valor_anticipo" value="${f.valor_anticipo}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>
          <div><label style="font-size:11px;">SOBRE ANTICIPO</label><input type="number" name="sobre_anticipo" value="${f.sobre_anticipo}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>
          <div><label style="font-size:11px;">ESTADO ANTICIPO</label><input type="text" name="estado_anticipo" value="${f.estado_anticipo||''}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>
          <div><label style="font-size:11px;">FECHA PAGO ANTICIPO</label><input type="date" name="fecha_pago_anticipo" value="${f.fecha_pago_anticipo||''}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>
          <div><label style="font-size:11px;">TIPO CUMPLIDO</label><input type="text" name="tipo_cumplido" value="${f.tipo_cumplido||''}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>
          <div><label style="font-size:11px;">FECHA CUMP. VIRTUAL</label><input type="date" name="fecha_cumplido_virtual" value="${f.fecha_cumplido_virtual||''}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>
          
          <div style="grid-column: span 3; background: #0f172a; padding:15px; border-radius:8px; display:grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap:10px;">
            <p style="grid-column: span 4; font-size:11px; color:#3b82f6; margin:0;">ENTREGA DE DOCUMENTOS (SI/NO)</p>
            <label style="font-size:10px;">MANIFIESTO <input type="text" name="entrega_manifiesto" value="${f.entrega_manifiesto}" style="width:100%; background:transparent; border:1px solid #334155; color:white;"></label>
            <label style="font-size:10px;">REMESA <input type="text" name="entrega_remesa" value="${f.entrega_remesa}" style="width:100%; background:transparent; border:1px solid #334155; color:white;"></label>
            <label style="font-size:10px;">HOJA TIEMPOS <input type="text" name="entrega_hoja_tiempos" value="${f.entrega_hoja_tiempos}" style="width:100%; background:transparent; border:1px solid #334155; color:white;"></label>
            <label style="font-size:10px;">DOCS CLIENTE <input type="text" name="entrega_documentos_cliente" value="${f.entrega_documentos_cliente}" style="width:100%; background:transparent; border:1px solid #334155; color:white;"></label>
            <label style="font-size:10px;">FACTURAS <input type="text" name="entrega_facturas" value="${f.entrega_facturas}" style="width:100%; background:transparent; border:1px solid #334155; color:white;"></label>
            <label style="font-size:10px;">TIRILLA VACIO <input type="text" name="entrega_tirilla_contenedor_vacio" value="${f.entrega_tirilla_contenedor_vacio}" style="width:100%; background:transparent; border:1px solid #334155; color:white;"></label>
            <label style="font-size:10px;">TIQ. CARGUE <input type="text" name="entrega_tiquete_cargue" value="${f.entrega_tiquete_cargue}" style="width:100%; background:transparent; border:1px solid #334155; color:white;"></label>
            <label style="font-size:10px;">TIQ. DESCARGUE <input type="text" name="entrega_tiquete_descargue" value="${f.entrega_tiquete_descargue}" style="width:100%; background:transparent; border:1px solid #334155; color:white;"></label>
          </div>

          <div><label style="font-size:11px;">VALOR DESCUENTO</label><input type="number" name="valor_descuento" value="${f.valor_descuento}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>
          <div><label style="font-size:11px;">RETEFUENTE</label><input type="number" name="retefuente" value="${f.retefuente}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>
          <div><label style="font-size:11px;">RETEICA</label><input type="number" name="reteica" value="${f.reteica}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>
          <div><label style="font-size:11px;">SALDO A PAGAR</label><input type="number" name="saldo_a_pagar" value="${f.saldo_a_pagar}" style="width:100%; padding:8px; background:#0f172a; color:#10b981; border:1px solid #334155; font-weight:bold;"></div>
          <div><label style="font-size:11px;">DÍAS SIN PAGAR</label><input type="number" name="dias_sin_pagar" value="${f.dias_sin_pagar}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>
          <div><label style="font-size:11px;">DÍAS SIN CUMPLIR</label><input type="number" name="dias_sin_cumplir" value="${f.dias_sin_cumplir}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>

          <button type="submit" style="grid-column: span 3; padding:15px; background:#3b82f6; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">GUARDAR GESTIÓN MANUAL COMPLETA</button>
        </form>
      </div>
    </body>`);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync({ alter: true }).then(() => app.listen(PORT));
