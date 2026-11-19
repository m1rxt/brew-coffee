const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('ru-RU').format(Number(n))+' ₸';
let editId=null,categories=[];
async function api(url,options={}){const r=await fetch(url,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});const data=await r.json();if(!r.ok)throw new Error(data.error||'Ошибка');return data}
async function loadCategories(){categories=await api('/api/categories');$('#form-category').innerHTML=categories.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}
async function loadProducts(){const list=await api('/api/products?sort=newest');$('#admin-products').innerHTML=list.map(p=>`<div class="admin-row"><div><b>${esc(p.name)}</b><small>${esc(p.category_name)} · ${money(p.price)}</small></div><div class="actions"><button data-edit="${p.id}">Изменить</button><button class="delete" data-delete="${p.id}">Удалить</button></div></div>`).join('')||'<p>Товаров пока нет.</p>'}
async function loadOrders(){const orders=await api('/api/orders');$('#orders').innerHTML=orders.map(o=>`<div class="order-row"><span><b>Заказ №${o.id}</b> · ${esc(o.customer_name)} · ${esc(o.phone)}</span><span>${o.positions} поз. · ${money(o.total)} · ${esc(o.status)}</span></div>`).join('')||'<p>Заказов пока нет.</p>'}
const modal=$('#modal'),form=$('#product-form');
function openForm(p=null){editId=p?.id??null;form.reset();$('#form-title').textContent=p?'Редактировать товар':'Новый товар';if(p){for(const k of ['name','description','price','image_url','category_id'])form.elements[k].value=p[k]??'';form.elements.is_available.checked=p.is_available;}else form.elements.is_available.checked=true;$('#form-message').textContent='';modal.classList.add('show')}
$('#add-btn').onclick=()=>openForm();
$('#close').onclick=()=>modal.classList.remove('show');
modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('show')});
$('#admin-products').addEventListener('click',async e=>{
 const edit=e.target.closest('[data-edit]'),del=e.target.closest('[data-delete]');
 if(edit){try{openForm(await api('/api/products/'+edit.dataset.edit))}catch(err){alert(err.message)}}
 if(del&&confirm('Удалить товар?')){try{await api('/api/products/'+del.dataset.delete,{method:'DELETE'});loadProducts()}catch(err){alert(err.message)}}
});
form.addEventListener('submit',async e=>{
 e.preventDefault();const d=new FormData(form);
 const payload={name:d.get('name'),description:d.get('description'),price:d.get('price'),category_id:d.get('category_id'),image_url:d.get('image_url'),is_available:form.elements.is_available.checked};
 try{await api(editId?'/api/products/'+editId:'/api/products',{method:editId?'PUT':'POST',body:JSON.stringify(payload)});modal.classList.remove('show');loadProducts()}catch(err){$('#form-message').textContent=err.message}
});
Promise.all([loadCategories(),loadProducts(),loadOrders()]).catch(err=>{alert('Не удалось загрузить данные: '+err.message)});
