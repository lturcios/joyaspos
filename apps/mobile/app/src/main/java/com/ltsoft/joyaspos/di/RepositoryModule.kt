package com.ltsoft.joyaspos.di

import com.ltsoft.joyaspos.data.repository.ProductoRepositoryImpl
import com.ltsoft.joyaspos.data.repository.VentaRepositoryImpl
import com.ltsoft.joyaspos.domain.repository.ProductoRepository
import com.ltsoft.joyaspos.domain.repository.VentaRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindVentaRepository(impl: VentaRepositoryImpl): VentaRepository

    @Binds
    @Singleton
    abstract fun bindProductoRepository(impl: ProductoRepositoryImpl): ProductoRepository
}
