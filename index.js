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

// MODELO EXTENDIDO CON TODAS LAS COLUMNAS SOLICITADAS
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  v_facturar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' },
  nro_factura: { type: DataTypes.STRING },
  fecha_pago_real: { type: DataTypes.DATEONLY },
  obs_contable: { type: DataTypes.TEXT },
  referencia_soporte: { type: DataTypes.STRING },

  // --- NUEVAS COLUMNAS AGREGADAS ---
  tipo_anticipo: { type: DataTypes.STRING },
  valor_anticipo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  sobre_anticipo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  estado_anticipo: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' },
  fecha_pago_anticipo: { type: DataTypes.DATEONLY },
  tipo_cumplido: { type: DataTypes.STRING },
  fecha_cumplido_virtual: { type: DataTypes.DATEONLY },
  // Checklist Documentos
  ent_manifiesto: { type: DataTypes.BOOLEAN, defaultValue: false },
  ent_remesa: { type: DataTypes.BOOLEAN, defaultValue: false },
  ent_hoja_tiempos: { type: DataTypes.BOOLEAN, defaultValue: false },
  ent_docs_cliente: { type: DataTypes.BOOLEAN, defaultValue: false },
  ent_facturas: { type: DataTypes.BOOLEAN, defaultValue: false },
  ent_tirilla_vacio: { type: DataTypes.BOOLEAN, defaultValue: false },
  ent_tiquete_cargue: { type: DataTypes.BOOLEAN, defaultValue: false },
  ent_tiquete_descargue: { type: DataTypes.BOOLEAN, defaultValue: false },
  // Novedades e Impuestos
  presenta_novedad: { type: DataTypes.STRING, defaultValue: 'NO' },
  obs_novedad: { type: DataTypes.TEXT },
  valor_descuento: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  fecha_cumplido_docs: { type: DataTypes.DATEONLY },
  fecha_legalizacion: { type: DataTypes.DATEONLY },
  retefuente: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  reteica: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 }
}, { tableName: 'Yego_Finanzas' });

// Función para calcular días (Auxiliar)
const calcDias = (fecha) => {
  if (!fecha) return 0;
  const diff = new Date() - new Date(fecha);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

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
      
      // Cálculo de Saldo a Pagar
      const deducciones = Number(f.valor_anticipo || 0) + Number(f.sobre_anticipo || 0) + Number(f.valor_descuento || 0) + Number(f.retefuente || 0) + Number(f.reteica || 0);
      const saldoAPagar = fletePagar - deducciones;

      if(estadoContable === 'PENDIENTE') totalPagar += saldoAPagar;
      totalFacturar += fleteFacturar;

      const tdStyle = `padding: 8px; text-align: center; border-right: 1px solid #334155; white-space: nowrap;`;

      return `
        <tr class="fila-carga" data-placa="${(c.placa || '').toLowerCase()}" style="border-bottom: 1px solid #334155; font-size: 11px;">
          <td style="${tdStyle}">${c.id}</td>
          <td style="${tdStyle}">${c.f_doc || '---'}</td>
          <td style="${tdStyle}">${c.placa}</td>
          <td style="${tdStyle} color: #10b981;">$${fletePagar.toLocaleString()}</td>
          <td style="${tdStyle} color: #ef4444;">$${deducciones.toLocaleString()}</td>
          <td style="${tdStyle} font-weight: bold; background: rgba(255,255,255,0.03);">$${saldoAPagar.toLocaleString()}</td>
          <td style="${tdStyle}">${f.estado_anticipo || '---'}</td>
          <td style="${tdStyle}">${f.fecha_cumplido_docs || '---'}</td>
          <td style="${tdStyle}">${calcDias(c.f_doc)} d</td>
          <td style="${tdStyle}">${f.fecha_cumplido_docs ? 'SÍ' : 'NO'}</td>
          <td style="${tdStyle}">
            <span style="background: ${estadoContable === 'PAGADO' ? '#065f46' : '#7f1d1d'}; padding: 3px 8px; border-radius: 4px;">
              ${estadoContable}
            </span>
          </td>
          <td style="padding: 8px; text-align: center;">
            <a href="/editar/${c.id}" style="color: #3b82f6; text-decoration: none; font-weight: bold;">GESTIONAR</a>
          </td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family: sans-serif; padding:15px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; background: #1e293b; padding: 15px; border-radius: 10px; border: 1px solid #334155;">
          <h2 style="margin:0; color: #3b82f6;">YEGO ERP CONTABLE</h2>
          <div style="display: flex; gap: 20px; text-align: right;">
            <div><small style="color:#ef4444;">SALDO POR PAGAR:</small><br><b style="font-size: 18px;">$ ${totalPagar.toLocaleString()}</b></div>
            <div style="border-left: 1px solid #475569; padding-left: 20px;"><small style="color:#3b82f6;">TOTAL FACTURACIÓN:</small><br><b style="font-size: 18px;">$ ${totalFacturar.toLocaleString()}</b></div>
          </div>
        </div>
        <input type="text" id="buscador" placeholder="🔍 Filtrar placa..." style="width:100%; padding:10px; margin-bottom:10px; border-radius:5px; background:#1e293b; color:white; border:1px solid #334155;">
        <div style="overflow-x: auto;">
          <table style="width:100%; border-collapse:collapse; background:#1e293b;">
            <thead style="background:#1e40af; font-size: 10px;">
              <tr>
                <th style="padding:10px;">ID</th><th>FECHA</th><th>PLACA</th><th>FLETE</th><th>DESC.</th><th>SALDO A PAGAR</th><th>EST. ANTICIPO</th><th>FECHA CUMP.</th><th>DÍAS SIN PAGAR</th><th>CUMPLIDO</th><th>ESTADO PAGO</th><th>ACCION</th>
              </tr>
            </thead>
            <tbody id="tabla-cargas">${filas}</tbody>
          </table>
        </div>
        <script>
          document.getElementById('buscador').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.fila-carga').forEach(f => f.style.display = f.getAttribute('data-placa').includes(term) ? '' : 'none');
          });
        </script>
      </body>`);
  } catch (err) { res.status(500).send(err.message); }
});

app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:20px;">
      <form action="/guardar/${req.params.id}" method="POST" style="max-width:900px; margin:auto; background:#1e293b; padding:25px; border-radius:15px; border:1px solid #3b82f6; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
        <h2 style="grid-column: span 3; color:#3b82f6; text-align:center; border-bottom:1px solid #334155; pb:10px;">Gestión de Carga #${req.params.id}</h2>
        
        <div style="grid-column: span 1; background: rgba(0,0,0,0.2); padding:10px; border-radius:8px;">
            <p style="color:#fbbf24; font-weight:bold; margin-top:0;">ANTICIPOS</p>
            <label style="font-size:10px;">TIPO ANTICIPO</label><input type="text" name="tipo_anticipo" value="${f.tipo_anticipo || ''}" style="width:100%; background:#0f172a; color:white; border:1px solid #475569; mb:5px;">
            <label style="font-size:10px;">VALOR ANTICIPO</label><input type="number" name="valor_anticipo" value="${f.valor_anticipo}" style="width:100%; background:#0f172a; color:white; border:1px solid #475569;">
            <label style="font-size:10px;">SOBRE ANTICIPO</label><input type="number" name="sobre_anticipo" value="${f.sobre_anticipo}" style="width:100%; background:#0f172a; color:white; border:1px solid #475569;">
            <label style="font-size:10px;">ESTADO ANTICIPO</label>
            <select name="estado_anticipo" style="width:100%; background:#0f172a; color:white;">
                <option ${f.estado_anticipo==='PENDIENTE'?'selected':''}>PENDIENTE</option>
                <option ${f.estado_anticipo==='PAGADO'?'selected':''}>PAGADO</option>
            </select>
            <label style="font-size:10px;">FECHA PAGO ANT.</label><input type="date" name="fecha_pago_anticipo" value="${f.fecha_pago_anticipo || ''}" style="width:100%; background:#0f172a; color:white;">
        </div>

        <div style="grid-column: span 1; background: rgba(0,0,0,0.2); padding:10px; border-radius:8px;">
            <p style="color:#3b82f6; font-weight:bold; margin-top:0;">CHECKLIST DOCUMENTOS</p>
            <div style="font-size:11px; display:grid; grid-template-columns: 1fr;">
                <label><input type="checkbox" name="ent_manifiesto" ${f.ent_manifiesto?'checked':''}> Manifiesto</label>
                <label><input type="checkbox" name="ent_remesa" ${f.ent_remesa?'checked':''}> Remesa</label>
                <label><input type="checkbox" name="ent_hoja_tiempos" ${f.ent_hoja_tiempos?'checked':''}> Hoja Tiempos</label>
                <label><input type="checkbox" name="ent_docs_cliente" ${f.ent_docs_cliente?'checked':''}> Docs Cliente</label>
                <label><input type="checkbox" name="ent_facturas" ${f.ent_facturas?'checked':''}> Facturas</label>
                <label><input type="checkbox" name="ent_tirilla_vacio" ${f.ent_tirilla_vacio?'checked':''}> Tirilla Vacío</label>
                <label><input type="checkbox" name="ent_tiquete_cargue" ${f.ent_tiquete_cargue?'checked':''}> Tiq. Cargue</label>
                <label><input type="checkbox" name="ent_tiquete_descargue" ${f.ent_tiquete_descargue?'checked':''}> Tiq. Descargue</label>
            </div>
        </div>

        <div style="grid-column: span 1; background: rgba(0,0,0,0.2); padding:10px; border-radius:8px;">
            <p style="color:#ef4444; font-weight:bold; margin-top:0;">NOVEDADES E IMPUESTOS</p>
            <label style="font-size:10px;">PRESENTA NOVEDAD?</label>
            <select name="presenta_novedad" style="width:100%; background:#0f172a; color:white;">
                <option ${f.presenta_novedad==='NO'?'selected':''}>NO</option>
                <option ${f.presenta_novedad==='SI'?'selected':''}>SI</option>
            </select>
            <label style="font-size:10px;">DESC. NOVEDAD ($)</label><input type="number" name="valor_descuento" value="${f.valor_descuento}" style="width:100%; background:#0f172a; color:white;">
            <label style="font-size:10px;">RETEFUENTE</label><input type="number" name="retefuente" value="${f.retefuente}" style="width:100%; background:#0f172a; color:white;">
            <label style="font-size:10px;">RETEICA</label><input type="number" name="reteica" value="${f.reteica}" style="width:100%; background:#0f172a; color:white;">
        </div>

        <div style="grid-column: span 3; display:grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap:10px; border-top: 1px solid #334155; pt:15px;">
            <label style="font-size:10px;">FLETE CONDUCTOR</label><input type="number" name="v_flete" value="${f.v_flete}" style="width:100%; background:#0f172a; color:#10b981; font-weight:bold;">
            <label style="font-size:10px;">FLETE FACTURAR</label><input type="number" name="v_facturar" value="${f.v_facturar}" style="width:100%; background:#0f172a; color:#3b82f6; font-weight:bold;">
            <label style="font-size:10px;">FECHA CUMP. DOCS</label><input type="date" name="fecha_cumplido_docs" value="${f.fecha_cumplido_docs || ''}" style="width:100%;">
            <label style="font-size:10px;">ESTADO PAGO FINAL</label>
            <select name="est_pago" style="width:100%; background:#065f46; color:white;">
                <option ${f.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
                <option ${f.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
            </select>
        </div>

        <button type="submit" style="grid-column: span 3; padding:15px; background:#3b82f6; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer; mt:10px;">GUARDAR CAMBIOS</button>
      </form>
    </body>`);
});

app.post('/guardar/:id', async (req, res) => {
  const data = req.body;
  // Convertir checkboxes a booleano
  const checks = ['ent_manifiesto','ent_remesa','ent_hoja_tiempos','ent_docs_cliente','ent_facturas','ent_tirilla_vacio','ent_tiquete_cargue','ent_tiquete_descargue'];
  checks.forEach(c => data[c] = data[c] === 'on');
  
  await Finanza.update(data, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync({ alter: true }).then(() => app.listen(PORT, () => console.log('🚀 SISTEMA COMPLETO ACTIVADO')));
