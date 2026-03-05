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

// --- MODELO DEFINITIVO CON TODOS LOS CAMPOS ---
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

// --- API DE GUARDADO RÁPIDO ---
app.post('/api/update-cell', async (req, res) => {
  try {
    const { cargaId, campo, valor } = req.body;
    const [registro] = await Finanza.findOrCreate({ where: { cargaId } });
    
    // Limpieza de datos según el tipo de campo
    let valorProcesado = valor.replace(/[$\s,]/g, ''); 
    if (['v_flete', 'v_facturar', 'valor_descuento', 'saldo_a_pagar'].includes(campo)) {
      valorProcesado = parseFloat(valorProcesado) || 0;
    }

    await registro.update({ [campo]: valorProcesado });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- VISTA PRINCIPAL CON GRID MASIVO ---
app.get('/', async (req, res) => {
  try {
    const cargas = await db.query(`SELECT * FROM "Cargas" WHERE placa IS NOT NULL AND placa != '' ORDER BY id DESC LIMIT 150`, { type: QueryTypes.SELECT });
    const finanzas = await Finanza.findAll();

    let totalPendiente = 0;

    const filas = cargas.map(c => {
      const f = finanzas.find(fin => fin.cargaId === c.id) || {};
      const flete = Number(f.v_flete || 0);
      if((f.est_pago || 'PENDIENTE') === 'PENDIENTE') totalPendiente += flete;

      const tdBase = `padding: 10px; text-align: center; border-right: 1px solid #334155; white-space: nowrap; outline: none; transition: 0.3s;`;
      
      // Helper para celdas editables (MODO EXCEL)
      const excelCell = (campo, valor, style = "") => `
        <td class="edit-cell" contenteditable="true" data-id="${c.id}" data-campo="${campo}" 
            style="${tdBase} ${style} background: rgba(255,255,255,0.02); cursor: cell;">
          ${valor || ''}
        </td>`;

      return `
        <tr class="fila" data-placa="${(c.placa || '').toLowerCase()}" style="border-bottom: 1px solid #334155; font-size: 11px;">
          <td style="${tdBase} color: #94a3b8;">#${c.id}</td>
          <td style="${tdBase}">${c.f_doc || ''}</td>
          <td style="${tdBase}">${c.oficina || ''}</td>
          <td style="${tdBase}">${c.orig || ''}</td>
          <td style="${tdBase}">${c.dest || ''}</td>
          <td style="${tdBase} font-weight: bold; color: #60a5fa;">${c.placa}</td>
          
          ${excelCell('v_flete', f.v_flete, "color: #10b981; font-weight: bold;")}
          ${excelCell('v_facturar', f.v_facturar, "color: #3b82f6;")}
          ${excelCell('est_pago', f.est_pago)}
          ${excelCell('tipo_anticipo', f.tipo_anticipo)}
          ${excelCell('valor_anticipo', f.valor_anticipo)}
          ${excelCell('estado_ant', f.estado_ant)}
          ${excelCell('fecha_pago_ant', f.fecha_pago_ant)}
          
          ${excelCell('ent_manifiesto', f.ent_manifiesto)}
          ${excelCell('ent_remesa', f.ent_remesa)}
          ${excelCell('ent_hoja_tiempos', f.ent_hoja_tiempos)}
          ${excelCell('ent_docs_cliente', f.ent_docs_cliente)}
          ${excelCell('ent_facturas', f.ent_facturas)}
          ${excelCell('ent_tiq_cargue', f.ent_tiq_cargue)}
          ${excelCell('ent_tiq_descargue', f.ent_tiq_descargue)}
          ${excelCell('presenta_novedades', f.presenta_novedades)}
          
          ${excelCell('obs_novedad', f.obs_novedad, "min-width: 150px; text-align: left;")}
          ${excelCell('valor_descuento', f.valor_descuento, "color: #ef4444;")}
          ${excelCell('retefuente', f.retefuente)}
          ${excelCell('reteica', f.reteica)}
          ${excelCell('saldo_a_pagar', f.saldo_a_pagar, "background: rgba(16,185,129,0.1); color: #10b981; font-weight: bold;")}
          ${excelCell('estado_final', f.estado_final)}
          ${excelCell('dias_sin_pagar', f.dias_sin_pagar, "color: #ef4444;")}
          
          <td style="padding: 10px; text-align: center;">
            <a href="/editar/${c.id}" style="color: #3b82f6; text-decoration: none;">[ABRIR]</a>
          </td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; margin:0; padding:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; background:#1e293b; padding:15px; border-radius:10px; border:1px solid #334155; margin-bottom:15px;">
          <h2 style="margin:0; color:#3b82f6;">CONTROL FINANCIERO YEGO (MODO EXCEL)</h2>
          <div style="text-align:right;">
            <small style="color:#94a3b8;">PENDIENTE TOTAL</small><br>
            <b style="font-size:22px; color:#10b981;">$ ${totalPendiente.toLocaleString('es-CO')}</b>
          </div>
        </div>

        <input type="text" id="buscador" placeholder="🔍 Filtrar por placa..." style="width:100%; padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px; margin-bottom:15px; outline:none;">

        <div style="overflow-x:auto; border:1px solid #334155; border-radius:10px;">
          <table style="width:100%; border-collapse:collapse; background:#1e293b; min-width:5500px;">
            <thead style="background:#1e40af; color:white; font-size:10px; text-transform:uppercase;">
              <tr>
                <th style="padding:15px;">ID</th><th>REGISTRO</th><th>OFICINA</th><th>ORIGEN</th><th>DESTINO</th><th>PLACA</th>
                <th>V. FLETE</th><th>V. FACTURAR</th><th>EST. PAGO</th><th>T. ANTICIPO</th><th>V. ANTICIPO</th><th>EST. ANT</th><th>F. PAGO ANT</th>
                <th>MANIF</th><th>REMES</th><th>HOJA T.</th><th>DOCS CLI</th><th>FACTS</th><th>T. CARG</th><th>T. DESC</th><th>NOVED</th>
                <th>OBSERVACIONES NOVEDAD</th><th>DESC</th><th>RET.F</th><th>RET.I</th><th>SALDO FINAL</th><th>ESTADO FINAL</th><th>MORA</th><th>ACCION</th>
              </tr>
            </thead>
            <tbody id="tabla-cargas">${filas}</tbody>
          </table>
        </div>

        <script>
          // Filtro de búsqueda
          document.getElementById('buscador').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.fila').forEach(tr => {
              tr.style.display = tr.getAttribute('data-placa').includes(term) ? '' : 'none';
            });
          });

          // Lógica de guardado instantáneo al salir de la celda (blur)
          document.querySelectorAll('.edit-cell').forEach(cell => {
            cell.addEventListener('blur', async function() {
              const payload = {
                cargaId: this.getAttribute('data-id'),
                campo: this.getAttribute('data-campo'),
                valor: this.innerText.trim()
              };

              this.style.background = 'rgba(59, 130, 246, 0.2)'; // Azul: Guardando

              try {
                const res = await fetch('/api/update-cell', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
                });
                if(res.ok) {
                  this.style.background = 'rgba(16, 185, 129, 0.2)'; // Verde: Guardado
                  setTimeout(() => this.style.background = 'rgba(255,255,255,0.02)', 800);
                }
              } catch (e) {
                this.style.background = 'rgba(239, 68, 68, 0.3)'; // Rojo: Error
              }
            });

            // Enter guarda y quita el foco
            cell.addEventListener('keydown', (e) => { if(e.key === 'Enter') { e.preventDefault(); cell.blur(); } });
          });
        </script>
        <style>
          .edit-cell:focus { background: #0f172a !important; border: 1px solid #3b82f6 !important; border-radius: 4px; }
          .edit-cell:hover { background: rgba(59, 130, 246, 0.1) !important; }
        </style>
      </body>`);
  } catch (err) { res.status(500).send(err.message); }
});

// Mantengo tus rutas de edición manual por si acaso
app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <body style="background:#0f172a; color:white; font-family:sans-serif; padding:40px;">
      <div style="max-width:600px; margin:auto; background:#1e293b; padding:30px; border-radius:15px; border:1px solid #3b82f6;">
        <h2>Edición Manual Carga #${req.params.id}</h2>
        <form action="/guardar/${req.params.id}" method="POST">
           <label style="display:block; margin-top:15px;">FLETE A PAGAR</label>
           <input type="number" step="0.01" name="v_flete" value="${f.v_flete}" style="width:100%; padding:10px; margin-top:5px; background:#0f172a; color:white; border:1px solid #334155;">
           
           <label style="display:block; margin-top:15px;">ESTADO DE PAGO</label>
           <input type="text" name="est_pago" value="${f.est_pago}" style="width:100%; padding:10px; margin-top:5px; background:#0f172a; color:white; border:1px solid #334155;">
           
           <button type="submit" style="width:100%; padding:15px; background:#3b82f6; border:none; border-radius:8px; color:white; font-weight:bold; margin-top:25px; cursor:pointer;">GUARDAR CAMBIOS</button>
        </form>
        <p style="text-align:center;"><a href="/" style="color:#94a3b8; text-decoration:none;">← Volver al Grid</a></p>
      </div>
    </body>`);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync({ alter: true }).then(() => app.listen(PORT, () => console.log('🚀 YEGO GRID FULL VERSION ONLINE')));
