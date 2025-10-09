# Sistema de Gestión ERP: Documentación Conceptual de Negocio

## Arquitectura General del Sistema

### Propósito y Alcance

Este sistema ERP implementa un modelo de gestión integrada de productos, inventario y unidades de medida para organizaciones de manufactura y distribución. El sistema opera bajo el patrón **Inventory Ledger** para garantizar auditabilidad y consistencia en los movimientos de inventario.

### Principios Fundamentales

- **Consistencia Transaccional**: Todas las operaciones críticas se ejecutan en transacciones de base de datos atómicas
- **Conversión Inteligente de UOM**: Soporte para conversiones específicas por producto y globales
- **Validaciones Preventivas**: Verificación de reglas de negocio antes de ejecutar operaciones
- **Modelo Lógico de Negocio**: Todas las operaciones manteniendo consistencia en unidades de base

---

## 1. Sistema de Gestión de Productos

### Estructura Jerárquica de Productos

- **Producto Base**: Entidad principal definida por SKU único dentro de la organización
- **Familias de Producto**: Agrupación lógica de productos variantes (ej: diferentes tamaños)
- **Categorías**: Clasificación organizacional de productos por tipo

### Estados y Ciclo de Vida de Productos

- **Activo/Inactivo**: Control del estado operativo del producto
- **Físico/No Físico**: Determinación si el producto requiere seguimiento de inventario
- **Perecedero**: Productos con fecha de caducidad y vida útil predefinida

### Atributos y Características

- **Atributos Dinámicos**: Campos extensibles para información adicional (colores, tamaños, especificaciones técnicas)
- **Imágenes y Media**: Sistema de gestión de archivos con imágenes primarias y secundarias
- **Identificadores Externos**: Soporte para códigos como GTIN, EAN, UPC, NDC según necesidades del negocio

### Configuración de Unidades de Medida por Producto

- **Unidad Base**: Medida fundamental del producto (ej: unidad individual, kilogramo, litro)
- **Conversiones Específicas**: Definición de cómo se mide el producto en diferentes presentaciones
- **Validación de Consistencia**: Aseguramiento de que todas las conversiones sean válidas y consistentes

---

## 2. Sistema de Unidades de Medida (UOM)

### Tipos de Unidades

- **Sistema UNECE**: Unidades estándar internacionales de comercio (ej: PIEZA, KILOGRAMO)
- **Sistema UCUM**: Unidades clínicas y científicas (ej: miligramos, mililitros)
- **Categorías Funciónales**: Conteo, Masa, Volumen, Longitud, Área, Tiempo
- **Unidades de Empaque**: Identificación especial para presentaciones físicas

### Jerarquía de Conversiones

1. **Conversión Específica por Producto** (prioridad alta): Para productos con requisitos únicos
2. **Conversión Global Estándar** (fallback): Reglas generales aplicables a múltiples productos

### Ejemplo de Jerarquía:

```
Producto "Coca-Cola 2L" (Base: Litros)
├── 1 Botella = 2 Litros (Específica del producto)
└── 1 Litro = 1000 Mililitros (Global estándar)
```

### Estados Operativos de UOM

- **Activa/Inactiva**: Control de disponibilidad para nuevas operaciones
- **Validaciones de Dependencia**: No se permite desactivar UOMs en uso por productos activos

---

## 3. Sistema de Inventario y Traza de Movimientos

### Patrón Inventory Ledger

**Cálculo de Stock Actual**: Suma acumulada de todos los movimientos históricos

```
Stock Actual = Σ (Entradas + Ajustes Positivos - Salidas - Ajustes Negativos)
```

### Tipos de Movimiento Registrados

- **receipt**: Entradas al inventario (compras, producción)
- **issue**: Salidas por ventas o consumo
- **transfer_in/out**: Movimientos entre almacenes/locations
- **adjustment_pos/neg**: Correcciones manuales de inventario
- **disassembly_in/out**: Operaciones de desempaque/conversión entre presentaciones

### Niveles de Seguimiento de Inventario

- **Sin Seguimiento**: Productos sin control individual
- **Por Lote**: Seguimiento por lotes de fabricación/proveedor
- **Por Número de Serie**: Control individual único
- **Lote + Serie**: Combinación de ambos niveles

### Información de Traza Completa

Cada movimiento registra:

- Cantidad en unidad base (para cálculos)
- Unidad de medida original (para contexto)
- Cantidad original (para referencia)
- Referencia a lote/serie si aplica
- Detalles de ubicación y almacén
- Costo unitario y moneda
- Timestamp preciso y referencia documental

---

## 4. Integración y Flujos de Proceso

### Flujo de Creación de Producto

1. **Definición Básica**: SKU, nombre, unidad base, caracteríticas físicas
2. **Configuración de UOM**: Definición de conversiones específicas si aplican
3. **Preparación de Inventario**: Validación de coherencia UOM vs stock
4. **Activación**: Producto listo para operaciones comerciales

### Flujo de Operaciones de Inventario

#### Entrada de Mercancía (Receipt)

1. **Validación de Producto**: Que exista y sea físico
2. **Conversión a Base**: Transformar cantidad a unité base del producto
3. **Registro de Movimiento**: Crear entrada en ledger
4. **Actualización de Costos**: Si se proporciona costo unitario

#### Salida de Mercancía (Issue)

1. **Validación de Stock**: Verificación de disponibilidad suficiente
2. **Lógica de Desempaque**: Si hay insuficiencia, desempacar presentaciones cuando sea posible
3. **Conversión a Base**: Transformar todas las líneas de venta a unidad base
4. **Registro de Salidas**: Crear movimientos de issue por cada línea
5. **Actualización de Ledger**: Reflejar reducción de stock

#### Ajustes de Inventario

1. **Justificación Obligatoria**: Todas las correcciones requieren motivo de negocio
2. **Validación vs Stock Actual**: Ajustes negativos no pueden generar stock negativo
3. **Traza de Auditoría**: Registro completo de quien, cuándo y por qué
4. **Referencia Opcional**: Enlace a conteo físico o documento justificativo

---

## 5. Reglas de Negocio y Validaciones

### Reglas de Consistencia de Producto

- **SKU Único por Organización**: No pueden existir productos con mismo código
- **Unidad Base Obligatoria**: Todo producto físico requiere unidad base definida
- **Validación de Conversiones**: Solo UOM existentes y activas pueden usarse
- **Integridad de Familias**: Operaciones respetan jerarquía de productos relacionados

### Reglas de Operaciones de Inventario

- **Solo Productos Físicos**: Operaciones requieren validación de tipo físico
- **Existencia de Stock**: Salidas y ajustes negativos requieren stock suficiente
- **Consistencia Transactional**: Toda operación completa o se revierte enteramente
- **Conversión Obrigona**: Todas las cantidades se convierten y almacenan en unidad base

### Reglas de Conversión de Unidades

- **Priorización Específica**: Conversiones por producto prevalecen sobre globales
- **Unidad Base Inmutable**: La unidad base de un producto no puede modificarse una vez creado
- **Factor de Conversión Positivo**: Todas las conversiones deben tener factor mayor a cero
- **Valiadción Circular**: No se permiten conversiciones recursivas entre UOMs

### Reglas de Estado y Ciclo de Vida

- **Productos Activos**: Solo pueden usarse en operaciones comerciales
- **UOM Activas**: Solo unidades ativas pueden asignarse a nuevos productos
- **Borrado Lógico**: No se eliminan registros, se desactivan (soft delete)
- **Dependencias de Integridad**: No se puede desactivar entidad con referencias activas

---

## 6. Procesos Automatizados y Lógica Específica

### Conversión Inteligente

Cuando una operación especifica cantidad en unidad no base:

```
Input: 3 Paquetes de 6 unidades cada uno
Producto Base: Unidades individuales

Proceso:
1. Buscar conversión específica: Paquete = 6 Unidades
2. Si no existe: Error "Conversión no definida"
3. Si existe: Calcular 3 × 6 = 18 unidades base
4. Registrar Movement: 18 unidades en base, 3 paquetes en uom
```

### Lógica de Desempaque Automático

Cuando venta requiere más stock del disponible:

```
Disponible: 5 unidades individuales
Venta Requerida: 10 unidades individuales
Presentación Existente: Caja = 12 unidades

Proceso:
1. Detectar insuficiencia: 10 requeridos - 5 disponibles = 5 faltantes
2. Calcular cajas necesarias: ceil(5 / 12) = 1 caja (12 unidades)
3. Verificar disponibilidad de cajas
4. Desempacar: -1 caja (disassembly_out) + 12 unidades (disassembly_in)
5. Completar venta: 5 disponibles + 12 desempacadas = 17 > 10 requeridos
```

### Cálculo de Stock en Tiempo Real

El stock siempre se calcula como suma acumulada:

```
Stock = Σ movimientos positivos - Σ movimientos negativos
Donde:
Positivos: receipt, transfer_in, adjustment_pos, disassembly_in
Negativos: issue, transfer_out, adjustment_neg, disassembly_out
```

---

## 7. Integraciones y APIs Diferenciadas

### Roles y Permisos

- **Usuario Regular**: Operaciones básicas de consulta y operaciones estándar
- **Administrador**: Operaciones de configuración, ajustes y desactivación de entidades

### Separación de Concernencias API

- **Consulta Pública**: Información de catálogo, precios públicos, UOM activas
- **Operaciones Protegidas**: Modificaciones de productos, inventario, ajustes
- **Administrativas**: Gestión de entidades, desactivaciones, configuración global

---

## Conclusión

Este sistema ERP asegura consistencia, auditabilidad y precisión en todas las operaciones comerciales mediante:

1. **Modelo Transaccional Rígido**: Todas las operaciones críticas son atómicas
2. **Conversión Inteligente**: Sistema flexible de UOM con jerarquía clara
3. **Ledger Inmutable**: Traza completa auditada de todos los movimientos
4. **Validaciones Preventivas**: Reglas de negocio aplicadas antes de cada operación
5. **Modelo de Negocio Flexible**: Soporte para múltiples estrategias de negocio mientras mantiene consistencia

La arquitectura permite crecer con las necesidades del negocio manteniendo siempre la integridad y consistencia de los datos comerciales críticos.
