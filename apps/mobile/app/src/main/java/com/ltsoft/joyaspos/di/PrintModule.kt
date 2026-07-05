package com.ltsoft.joyaspos.di

import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

// Providers implemented in SKILL-18 (sunmi-printer-sdk) and SKILL-17
@Module
@InstallIn(SingletonComponent::class)
object PrintModule
