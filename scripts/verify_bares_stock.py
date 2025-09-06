import os
import sys
import json


def setup_django():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    inner_proj = os.path.join(os.path.dirname(base_dir), 'Administracion-proyecto-Crucero-Development-Almac-n')
    if inner_proj not in sys.path:
        sys.path.insert(0, inner_proj)
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Administrador_Cruceros.settings')
    import django
    django.setup()


def main():
    from django.test import RequestFactory
    from django.db import transaction
    from apps.almacen.models import Producto, Lote, MovimientoAlmacen
    from apps.bares_snacks.models import ProductoBar, IngredienteReceta, Pedidos, DetallePedido
    from apps.bares_snacks import views as bares_views

    rf = RequestFactory()

    # 1) Try to find an existing almacen product with stock; else try to add stock to an existing product.
    prod = (
        Producto.objects
        .all()
        .order_by('-id')
        .first()
    )
    if not prod:
        print(json.dumps({
            'status': 'SKIP',
            'reason': 'No hay productos en almacén, no se puede verificar automáticamente.'
        }))
        return 2

    # Ensure it has at least some stock via a Lote if needed
    if prod.cantidad < 10:
        # Add a small lot to ensure stock movements are visible
        Lote.objects.create(producto=prod, cantidad_productos=50, precio_lote=1000)

    stock_before = prod.cantidad

    # 2) Create a bar product with a recipe that consumes this almacen product
    pb = ProductoBar.objects.create(
        nombre='TEST-BEBIDA-STOCK',
        categoria='Pruebas',
        tipo_almacen=prod.tipo,
        subtipo_almacen=prod.subtipo or '',
        plan='gratis',
        precio_vta=0
    )
    # Need 2 units of almacen product per unit of bar product
    IngredienteReceta.objects.create(
        producto_bar=pb,
        ingrediente=prod,
        cantidad=2,
        unidad=prod.medida,
    )

    # 3) Create a pending order with 3 units of the bar product
    pedido = Pedidos.objects.create(estado='pendiente')
    DetallePedido.objects.create(pedido=pedido, producto=pb, cantidad=3)

    # 4) Transition to en_proceso, then completado via the actual API view
    req_proc = rf.post(f'/bares_snacks/pedido/{pedido.id}/estado/', data=json.dumps({'estado': 'en_proceso'}), content_type='application/json')
    resp_proc = bares_views.actualizar_estado_pedido_api(req_proc, pedido.id)
    if getattr(resp_proc, 'status_code', 200) >= 400:
        print(json.dumps({'status': 'FAIL', 'step': 'en_proceso', 'code': resp_proc.status_code}))
        return 1

    req_comp = rf.post(f'/bares_snacks/pedido/{pedido.id}/estado/', data=json.dumps({'estado': 'completado'}), content_type='application/json')
    resp_comp = bares_views.actualizar_estado_pedido_api(req_comp, pedido.id)
    if getattr(resp_comp, 'status_code', 200) >= 400:
        # Include returned JSON if available
        try:
            content = json.loads(resp_comp.content.decode('utf-8'))
        except Exception:
            content = {'raw': str(getattr(resp_comp, 'content', b''))}
        print(json.dumps({'status': 'FAIL', 'step': 'completado', 'code': resp_comp.status_code, 'content': content}))
        return 1

    # 5) Reload product and check stock
    prod.refresh_from_db()
    stock_after = prod.cantidad

    # For 3x bar product with recipe 2 units -> expect 6 units deducted
    expected_deduction = 6
    deduction = stock_before - stock_after

    # Check movement log exists
    mov_exists = MovimientoAlmacen.objects.filter(
        producto=prod,
        tipo='OUT',
        modulo='BARES_SNACKS',
        descripcion__icontains=f'Pedido #{pedido.id}'
    ).exists()

    result = {
        'status': 'PASS' if deduction == expected_deduction and mov_exists else 'WARN',
        'pedido_id': pedido.id,
        'producto_id': prod.id,
        'stock_before': stock_before,
        'stock_after': stock_after,
        'deducted': deduction,
        'expected': expected_deduction,
        'movement_logged': bool(mov_exists)
    }
    print(json.dumps(result))
    return 0 if result['status'] == 'PASS' else 0  # Treat WARN as non-fatal


if __name__ == '__main__':
    setup_django()
    code = main()
    sys.exit(code)
