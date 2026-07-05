package com.ltsoft.joyaspos.di

import android.content.Context
import androidx.room.Room
import com.ltsoft.joyaspos.data.local.JoyasDatabase
import com.ltsoft.joyaspos.data.local.dao.ProductoDao
import com.ltsoft.joyaspos.data.local.dao.VentaDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): JoyasDatabase {
        return Room.databaseBuilder(
            context,
            JoyasDatabase::class.java,
            JoyasDatabase.DATABASE_NAME,
        ).build()
    }

    @Provides
    fun provideVentaDao(db: JoyasDatabase): VentaDao = db.ventaDao()

    @Provides
    fun provideProductoDao(db: JoyasDatabase): ProductoDao = db.productoDao()
}
