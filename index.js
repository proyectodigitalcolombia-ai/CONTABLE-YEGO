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

// MODELO COMPLETO (Se mantiene igual)
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

// NUEVA RUTA: GUARDADO RÁPIDO (AJAX)
app.post('/api/update-cell', async (req, res) => {
  try {
    const { cargaId, campo, valor } = req.body;
    const [finanza] = await Finanza.findOrCreate({ where: { cargaId } });
    await finanza.update({ [campo]: valor });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', async (req, res) => {
  try {
    const sql = `SELECT * FROM "Cargas" WHERE placa IS NOT NULL AND placa != '' ORDER BY id DESC LIMIT 150`;
    const cargas = await db.query(sql, { type: QueryTypes.SELECT });
    const finanzas = await Finanza.findAll();

    let totalPendiente = 0;
    let filas = cargas.map(c => {
      const f = finanzas.find(fin => fin.cargaId === c.id) || {};
      const fletePagar = Number(f.v_flete || 0);
      if((f.est_pago || "PENDIENTE") === 'PENDIENTE') totalPendiente += fletePagar;

      const tdS = `padding: 10px; text-align: center; border-right: 1px solid #334155; white-space: nowrap;`;
      
      // Función para generar celdas editables
      const editable = (campo, valor) => {
        return `<td class="editable" data-id="${c.id}" data-campo="${campo}" contenteditable="true" style="${tdS} cursor: cell; background: rgba(255,255,255,0.02); min-width: 50px;">${valor || ''}</td>`;
      };

      return `
        <tr class="fila-carga" data-placa="${(c.placa || '').toLowerCase()}" style="border-bottom: 1px solid #334155; font-size: 11px;">
          <td style="${tdS} color: #94a3b8;">#${c.id}</td>
          <td style="${tdS}">${c.f_doc || '---'}</td>
          <td style="${tdS}">${c.oficina || '---'}</td>
          <td style="${tdS}">${c.orig || '---'}</td>
          <td style="${tdS}">${c.dest || '---'}</td>
          <td style="${tdS}">${c.cli || '---'}</td>
          <td style="${tdS}">${c.cont || '---'}</td>
          <td style="${tdS}">${c.ped || '---'}</td>
          <td style="${tdS} background: rgba(59, 130, 246, 0.1); font-weight: bold;">${c.placa}</td>
          <td style="${tdS}">${c.muc || '---'}</td>
          
          ${editable('v_flete', f.v_flete)}
          ${editable('v_facturar', f.v_facturar)}
          
          <td style="${tdS}">${c.f_act || '---'}</td>
          <td style="${tdS} color: #fbbf24;">${c.est_real || '---'}</td>
          
          ${editable('tipo_anticipo', f.tipo_anticipo)}
          ${editable('valor_anticipo', f.valor_anticipo)}
          ${editable('sobre_anticipo', f.sobre_anticipo)}
          ${editable('estado_ant', f.estado_ant)}
          ${editable('fecha_pago_ant', f.fecha_pago_ant)}
          ${editable('tipo_cumplido', f.tipo_cumplido)}
          ${editable('fecha_cump_virtual', f.fecha_cump_virtual)}
          
          ${editable('ent_manifiesto', f.ent_manifiesto)}
          ${editable('ent_remesa', f.ent_remesa)}
          ${editable('ent_hoja_tiempos', f.ent_hoja_tiempos)}
          ${editable('ent_docs_cliente', f.ent_docs_cliente)}
          ${editable('ent_facturas', f.ent_facturas)}
          ${editable('ent_tirilla_vacio', f.ent_tirilla_vacio)}
          ${editable('ent_tiq_cargue', f.ent_tiq_cargue)}
          ${editable('ent_tiq_descargue', f.ent_tiq_descargue)}
          ${editable('presenta_novedades', f.presenta_novedades)}
          
          ${editable('obs_novedad', f.obs_novedad)}
          ${editable('valor_descuento', f.valor_descuento)}
          ${editable('fecha_cump_docs', f.fecha_cump_docs)}
          ${editable('fecha_legalizacion', f.fecha_legalizacion)}
          ${editable('retefuente', f.retefuente)}
          ${editable('reteica', f.reteica)}
          ${editable('saldo_a_pagar', f.saldo_a_pagar)}
          ${editable('estado_final', f.estado_final)}
          ${editable('dias_sin_pagar', f.dias_sin_pagar)}
          ${editable('dias_sin_cumplir', f.dias_sin_cumplir)}

          <td style="padding: 10px; text-align: center;">
            <a href="/editar/${c.id}" style="color: #3b82f6; text-decoration: none; font-weight: bold;">[ABRIR]</a>
          </td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family: 'Segoe UI', sans-serif; padding:15px; margin:0;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; background: #1e293b; padding: 12px; border-radius: 8px; border: 1px solid #334155;">
          <h2 style="margin:0; color: #3b82f6;">YEGO SMART GRID (MODO EXCEL)</h2>
          <div style="text-align: right; background: rgba(239, 68, 68, 0.1); padding: 5px 15px; border-radius: 6px; border: 1px solid #ef4444;">
            <small style="color:#ef4444; font-weight: bold;">TOTAL POR PAGAR:</small><br>
            <b style="color:#f1f5f9; font-size: 20px;">$ ${totalPendiente.toLocaleString('es-CO')}</b>
          </div>
        </div>

        <input type="text" id="buscador" placeholder="🔍 Filtrar por placa..." style="width:100%; padding:12px; margin-bottom:15px; border-radius:6px; border:1px solid #334155; background:#1e293b; color:white; outline: none;">
        
        <div style="overflow-x: auto; border-radius: 8px; border: 1px solid #334155;">
          <table id="grid-yego" style="width:100%; border-collapse:collapse; background:#1e293b; min-width: 6500px;">
            <thead style="background:#1e40af; color: white; font-size: 10px; text-transform: uppercase;">
              <tr>
                <th style="padding:15px;">ID</th><th>REGISTRO</th><th>OFICINA</th><th>ORIGEN</th><th>DESTINO</th><th>CLIENTE</th><th>CONTENEDOR</th><th>PEDIDO</th><th>PLACA</th><th>MUC</th>
                <th>V. FLETE</th><th>V. FACTURAR</th><th>ACTUALIZACIÓN</th><th>ESTADO LOGIS</th>
                <th>T. ANTICIPO</th><th>V. ANTICIPO</th><th>S. ANTICIPO</th><th>E. ANTICIPO</th><th>F. PAGO ANT</th><th>T. CUMPLIDO</th><th>F. VIRTUAL</th>
                <th>MANIFIESTO</th><th>REMESA</th><th>HOJA TIEMPOS</th><th>DOCS CLI</th><th>FACTURAS</th><th>TIRILLA</th><th>T. CARGUE</th><th>T. DESCARGUE</th><th>NOVEDADES</th>
                <th>OBSERVACION</th><th>DESCUENTO</th><th>F. CUMPLIDO</th><th>F. LEGALIZA</th><th>RETE F</th><th>RETE I</th><th>SALDO</th><th>ESTADO FINAL</th><th>D. SIN PAGAR</th><th>D. SIN CUMPLIR</th><th>ACCION</th>
              </tr>
            </thead>
            <tbody id="tabla-cargas">${filas}</tbody>
          </table>
        </div>

        <script>
          // Filtro de placa
          document.getElementById('buscador').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.fila-carga').forEach(fila => {
              fila.style.display = fila.getAttribute('data-placa').includes(term) ? '' : 'none';
            });
          });

          // LÓGICA DE EDICIÓN EXCEL (AJAX)
          document.querySelectorAll('.editable').forEach(cell => {
            // Guardar al perder el foco
            cell.addEventListener('blur', function() {
              const cargaId = this.getAttribute('data-id');
              const campo = this.getAttribute('data-campo');
              const valor = this.innerText.trim();

              fetch('/api/update-cell', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cargaId, campo, valor })
              })
              .then(res => res.json())
              .then(data => {
                if(data.success) {
                  this.style.background = 'rgba(16, 185, 129, 0.2)'; // Verde breve al guardar
                  setTimeout(() => this.style.background = 'rgba(255,255,255,0.02)', 500);
                }
              });
            });

            // Guardar al presionar Enter y saltar de celda
            cell.addEventListener('keydown', function(e) {
              if (e.key === 'Enter') {
                e.preventDefault();
                this.blur();
              }
            });
          });
        </script>
        <style>
          .editable:focus { background: #334155 !important; outline: 2px solid #3b82f6; color: white; }
          .editable:hover { background: rgba(59, 130, 246, 0.1) !important; }
        </style>
      </body>`);
  } catch (err) { res.status(500).send("Error: " + err.message); }
});

// Rutas originales de edición manual (Se mantienen por si prefieres el formulario)
app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`... Formulario de edición original ...`); 
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync({ alter: true }).then(() => app.listen(PORT));
