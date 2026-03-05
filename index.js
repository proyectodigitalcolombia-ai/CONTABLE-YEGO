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

// MODELO EXTENDIDO PARA GESTIÓN MANUAL
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  v_facturar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' },
  // NUEVOS CAMPOS DE GESTIÓN
  nro_factura: { type: DataTypes.STRING },
  fecha_pago_real: { type: DataTypes.DATEONLY },
  obs_contable: { type: DataTypes.TEXT },
  referencia_soporte: { type: DataTypes.STRING },
  // CAMPOS ADICIONALES SOLICITADOS
  tipo_anticipo: { type: DataTypes.STRING },
  valor_anticipo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  sobre_anticipo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  estado_anticipo: { type: DataTypes.STRING },
  fecha_pago_anticipo: { type: DataTypes.DATEONLY },
  tipo_cumplido: { type: DataTypes.STRING },
  fecha_cumplido_virtual: { type: DataTypes.DATEONLY },
  entrega_manifiesto: { type: DataTypes.STRING },
  entrega_remesa: { type: DataTypes.STRING },
  entrega_hoja_tiempos: { type: DataTypes.STRING },
  entrega_docs_cliente: { type: DataTypes.STRING },
  entrega_facturas: { type: DataTypes.STRING },
  entrega_tirilla_vacio: { type: DataTypes.STRING },
  entrega_tiquete_cargue: { type: DataTypes.STRING },
  entrega_tiquete_descargue: { type: DataTypes.STRING },
  presenta_novedades: { type: DataTypes.STRING },
  obs_novedad: { type: DataTypes.TEXT },
  valor_descuento: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  fecha_cumplido_docs: { type: DataTypes.DATEONLY },
  fecha_legalizacion: { type: DataTypes.DATEONLY },
  retefuente: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  reteica: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  saldo_a_pagar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  estado_gestion: { type: DataTypes.STRING },
  dias_sin_pagar: { type: DataTypes.INTEGER },
  dias_sin_cumplir: { type: DataTypes.INTEGER }
}, { tableName: 'Yego_Finanzas' });

app.get('/', async (req, res) => {
  try {
    const sql = `SELECT * FROM "Cargas" WHERE placa IS NOT NULL AND placa != '' ORDER BY id DESC LIMIT 150`;
    const cargas = await db.query(sql, { type: QueryTypes.SELECT });
    const finanzas = await Finanza.findAll();

    let totalPagar = 0;
    let totalFacturar = 0;

    let filas = cargas.map(c => {
      const f = finanzas.find(fin => fin.cargaId === c.id);
      const fletePagar = f ? Number(f.v_flete) : 0;
      const fleteFacturar = f ? Number(f.v_facturar) : 0;
      const estadoContable = f ? f.est_pago : "PENDIENTE";
      const factura = f ? (f.nro_factura || '---') : '---';

      if(estadoContable === 'PENDIENTE') totalPagar += fletePagar;
      totalFacturar += fleteFacturar;

      const tdStyle = `padding: 8px; text-align: center; border-right: 1px solid #334155;`;

      return `
        <tr class="fila-carga" data-placa="${(c.placa || '').toLowerCase()}" style="border-bottom: 1px solid #334155; font-size: 11px; background: ${estadoContable === 'PAGADO' ? 'rgba(16, 185, 129, 0.03)' : 'transparent'};">
          <td style="${tdStyle} color: #94a3b8;">#${c.id}</td>
          <td style="${tdStyle}">${c.f_doc || '---'}</td>
          <td style="${tdStyle}">${c.cli || '---'}</td>
          <td style="${tdStyle} font-weight: bold;">${c.placa}</td>
          <td style="${tdStyle} color: #10b981; font-weight: bold;">$${fletePagar.toLocaleString('es-CO')}</td>
          <td style="${tdStyle} color: #3b82f6; font-weight: bold;">$${fleteFacturar.toLocaleString('es-CO')}</td>
          <td style="${tdStyle} color: #fbbf24; font-weight: bold;">${factura}</td>
          <td style="${tdStyle}">${f ? f.tipo_anticipo || '---' : '---'}</td>
          <td style="${tdStyle}">$${f ? Number(f.valor_anticipo).toLocaleString('es-CO') : 0}</td>
          <td style="${tdStyle}">$${f ? Number(f.saldo_a_pagar).toLocaleString('es-CO') : 0}</td>
          <td style="${tdStyle} font-weight: bold; color: #fbbf24;">${c.est_real || '---'}</td>
          <td style="${tdStyle}">
            <span style="background: ${estadoContable === 'PAGADO' ? '#065f46' : '#7f1d1d'}; padding: 3px 8px; border-radius: 4px; font-size: 10px;">
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
          <table style="width:100%; border-collapse:collapse; background:#1e293b; min-width: 1600px;">
            <thead style="background:#1e40af; font-size: 10px; text-transform: uppercase;">
              <tr>
                <th style="padding:12px; border-right: 1px solid #475569;">ID</th>
                <th style="border-right: 1px solid #475569;">REGISTRO</th>
                <th style="border-right: 1px solid #475569;">CLIENTE</th>
                <th style="border-right: 1px solid #475569;">PLACA</th>
                <th style="border-right: 1px solid #475569; background:#064e3b">V. FLETE</th>
                <th style="border-right: 1px solid #475569; background:#1e3a8a">V. FACTURA</th>
                <th style="border-right: 1px solid #475569; color: #fbbf24;">N° FACTURA</th>
                <th style="border-right: 1px solid #475569;">TIPO ANTICIPO</th>
                <th style="border-right: 1px solid #475569;">VALOR ANTICIPO</th>
                <th style="border-right: 1px solid #475569;">SALDO A PAGAR</th>
                <th style="border-right: 1px solid #475569;">ESTADO LOG.</th>
                <th style="border-right: 1px solid #475569;">ESTADO PAGO</th>
                <th>GESTIÓN</th>
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

// FORMULARIO DE GESTIÓN MANUAL AVANZADO
app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:20px; display:flex; justify-content:center;">
      <div style="width:100%; max-width:850px; background:#1e293b; padding:30px; border-radius:15px; border:1px solid #3b82f6; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);">
        <h2 style="color:#3b82f6; margin-top:0; text-align:center; border-bottom: 1px solid #334155; padding-bottom:10px;">Gestión Completa #${req.params.id}</h2>
        
        <form action="/guardar/${req.params.id}" method="POST" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
          
          <div><label style="font-size:11px; color:#94a3b8;">FLETE CONDUCTOR</label><input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%; padding:8px; background:#0f172a; color:#10b981; border:1px solid #334155; border-radius:5px;"></div>
          <div><label style="font-size:11px; color:#94a3b8;">VALOR A FACTURAR</label><input type="number" name="v_facturar" value="${f.v_facturar}" step="0.01" style="width:100%; padding:8px; background:#0f172a; color:#3b82f6; border:1px solid #334155; border-radius:5px;"></div>
          <div><label style="font-size:11px; color:#94a3b8;">NRO FACTURA</label><input type="text" name="nro_factura" value="${f.nro_factura || ''}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155; border-radius:5px;"></div>
          
          <div><label style="font-size:11px; color:#94a3b8;">TIPO ANTICIPO</label><input type="text" name="tipo_anticipo" value="${f.tipo_anticipo || ''}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155; border-radius:5px;"></div>
          <div><label style="font-size:11px; color:#94a3b8;">VALOR ANTICIPO</label><input type="number" name="valor_anticipo" value="${f.valor_anticipo}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155; border-radius:5px;"></div>
          <div><label style="font-size:11px; color:#94a3b8;">SOBRE ANTICIPO</label><input type="number" name="sobre_anticipo" value="${f.sobre_anticipo}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155; border-radius:5px;"></div>
          
          <div><label style="font-size:11px; color:#94a3b8;">ESTADO ANTICIPO</label><input type="text" name="estado_anticipo" value="${f.estado_anticipo || ''}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155; border-radius:5px;"></div>
          <div><label style="font-size:11px; color:#94a3b8;">FECHA PAGO ANTICIPO</label><input type="date" name="fecha_pago_anticipo" value="${f.fecha_pago_anticipo || ''}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155; border-radius:5px;"></div>
          <div><label style="font-size:11px; color:#94a3b8;">TIPO CUMPLIDO</label><input type="text" name="tipo_cumplido" value="${f.tipo_cumplido || ''}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155; border-radius:5px;"></div>
          
          <div><label style="font-size:11px; color:#94a3b8;">FECHA CUMP. VIRTUAL</label><input type="date" name="fecha_cumplido_virtual" value="${f.fecha_cumplido_virtual || ''}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155; border-radius:5px;"></div>
          <div><label style="font-size:11px; color:#94a3b8;">FECHA PAGO REAL</label><input type="date" name="fecha_pago_real" value="${f.fecha_pago_real || ''}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155; border-radius:5px;"></div>
          <div><label style="font-size:11px; color:#94a3b8;">FECHA CUMP. DOCS</label><input type="date" name="fecha_cumplido_docs" value="${f.fecha_cumplido_docs || ''}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155; border-radius:5px;"></div>

          <div style="grid-column: span 3; background: #0f172a; padding: 10px; border-radius: 5px; display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px;">
            <label style="font-size:10px;"><input type="checkbox" name="entrega_manifiesto" value="SI" ${f.entrega_manifiesto === 'SI' ? 'checked' : ''}> MANIFIESTO</label>
            <label style="font-size:10px;"><input type="checkbox" name="entrega_remesa" value="SI" ${f.entrega_remesa === 'SI' ? 'checked' : ''}> REMESA</label>
            <label style="font-size:10px;"><input type="checkbox" name="entrega_hoja_tiempos" value="SI" ${f.entrega_hoja_tiempos === 'SI' ? 'checked' : ''}> HOJA TIEMPOS</label>
            <label style="font-size:10px;"><input type="checkbox" name="entrega_docs_cliente" value="SI" ${f.entrega_docs_cliente === 'SI' ? 'checked' : ''}> DOCS CLIENTE</label>
            <label style="font-size:10px;"><input type="checkbox" name="entrega_facturas" value="SI" ${f.entrega_facturas === 'SI' ? 'checked' : ''}> FACTURAS</label>
            <label style="font-size:10px;"><input type="checkbox" name="entrega_tirilla_vacio" value="SI" ${f.entrega_tirilla_vacio === 'SI' ? 'checked' : ''}> TIRILLA VACIO</label>
            <label style="font-size:10px;"><input type="checkbox" name="entrega_tiquete_cargue" value="SI" ${f.entrega_tiquete_cargue === 'SI' ? 'checked' : ''}> TIQ. CARGUE</label>
            <label style="font-size:10px;"><input type="checkbox" name="entrega_tiquete_descargue" value="SI" ${f.entrega_tiquete_descargue === 'SI' ? 'checked' : ''}> TIQ. DESCARGUE</label>
          </div>

          <div><label style="font-size:11px; color:#94a3b8;">NOVEDADES?</label><input type="text" name="presenta_novedades" value="${f.presenta_novedades || 'NO'}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155; border-radius:5px;"></div>
          <div><label style="font-size:11px; color:#94a3b8;">VALOR DESCUENTO</label><input type="number" name="valor_descuento" value="${f.valor_descuento}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155; border-radius:5px;"></div>
          <div><label style="font-size:11px; color:#94a3b8;">SALDO A PAGAR</label><input type="number" name="saldo_a_pagar" value="${f.saldo_a_pagar}" style="width:100%; padding:8px; background:#0f172a; color:#fbbf24; border:1px solid #334155; border-radius:5px; font-weight:bold;"></div>

          <div style="grid-column: span 3;">
            <label style="font-size:11px; color:#94a3b8;">OBSERVACIONES / SOPORTE</label>
            <textarea name="obs_contable" rows="2" style="width:100%; padding:10px; background:#0f172a; color:white; border:1px solid #334155; border-radius:5px; resize:none;">${f.obs_contable || ''}</textarea>
          </div>

          <button type="submit" style="grid-column: span 3; padding:15px; background:#3b82f6; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">GUARDAR GESTIÓN MANUAL</button>
        </form>
        <p style="text-align:center; margin-top:10px;"><a href="/" style="color:#94a3b8; text-decoration:none;">← Volver al Tablero</a></p>
      </div>
    </body>`);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync({ alter: true }).then(() => app.listen(PORT, () => console.log('🚀 YEGO GESTIÓN MANUAL ACTIVADA')));
