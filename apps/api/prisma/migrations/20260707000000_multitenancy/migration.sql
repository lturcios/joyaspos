-- DropIndex
DROP INDEX `productos_nombre_key` ON `productos`;

-- AlterTable
ALTER TABLE `compras` ADD COLUMN `sucursal_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `productos` ADD COLUMN `sucursal_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `proveedores` ADD COLUMN `empresa_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `usuarios` ADD COLUMN `empresa_id` INTEGER NOT NULL,
    ADD COLUMN `sucursal_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `ventas` ADD COLUMN `sucursal_id` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `empresas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(150) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `empresas_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sucursales` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresa_id` INTEGER NOT NULL,
    `nombre` VARCHAR(150) NOT NULL,
    `direccion` VARCHAR(255) NULL,
    `telefono` VARCHAR(20) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_sucursales_empresa`(`empresa_id`),
    UNIQUE INDEX `sucursales_empresa_id_nombre_key`(`empresa_id`, `nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `idx_compras_sucursal_fecha` ON `compras`(`sucursal_id`, `fecha_hora`);

-- CreateIndex
CREATE INDEX `idx_productos_sucursal` ON `productos`(`sucursal_id`);

-- CreateIndex
CREATE UNIQUE INDEX `productos_sucursal_id_nombre_key` ON `productos`(`sucursal_id`, `nombre`);

-- CreateIndex
CREATE INDEX `idx_proveedores_empresa` ON `proveedores`(`empresa_id`);

-- CreateIndex
CREATE UNIQUE INDEX `proveedores_empresa_id_nombre_key` ON `proveedores`(`empresa_id`, `nombre`);

-- CreateIndex
CREATE INDEX `idx_usuarios_empresa` ON `usuarios`(`empresa_id`);

-- CreateIndex
CREATE INDEX `idx_usuarios_sucursal` ON `usuarios`(`sucursal_id`);

-- CreateIndex
CREATE INDEX `idx_ventas_sucursal_fecha` ON `ventas`(`sucursal_id`, `fecha_hora`);

-- AddForeignKey
ALTER TABLE `sucursales` ADD CONSTRAINT `sucursales_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_sucursal_id_fkey` FOREIGN KEY (`sucursal_id`) REFERENCES `sucursales`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productos` ADD CONSTRAINT `productos_sucursal_id_fkey` FOREIGN KEY (`sucursal_id`) REFERENCES `sucursales`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ventas` ADD CONSTRAINT `ventas_sucursal_id_fkey` FOREIGN KEY (`sucursal_id`) REFERENCES `sucursales`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `proveedores` ADD CONSTRAINT `proveedores_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `compras` ADD CONSTRAINT `compras_sucursal_id_fkey` FOREIGN KEY (`sucursal_id`) REFERENCES `sucursales`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
