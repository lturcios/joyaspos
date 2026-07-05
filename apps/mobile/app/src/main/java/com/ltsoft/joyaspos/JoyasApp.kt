package com.ltsoft.joyaspos

import android.app.Application
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import com.ltsoft.joyaspos.print.SunmiPrintHelper
import com.ltsoft.joyaspos.worker.WorkManagerSetup
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class JoyasApp : Application(), Configuration.Provider {

    @Inject lateinit var workerFactory: HiltWorkerFactory

    // Eager injection starts AIDL binding before any ViewModel is created
    @Inject lateinit var printHelper: SunmiPrintHelper

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()

    override fun onCreate() {
        super.onCreate()
        WorkManagerSetup.initialize(this)
    }
}
