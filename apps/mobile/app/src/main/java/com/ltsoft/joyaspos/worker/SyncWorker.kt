package com.ltsoft.joyaspos.worker

import android.content.Context
import android.util.Log
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.ltsoft.joyaspos.domain.repository.VentaRepository
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject

@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val ventaRepository: VentaRepository,
) : CoroutineWorker(context, params) {

    companion object {
        private const val TAG = "SyncWorker"
        const val WORK_NAME_PERIODIC = "sync_worker_periodic"
        const val WORK_NAME_ONETIME = "sync_worker_onetime"
        const val MAX_ATTEMPTS = 5
    }

    override suspend fun doWork(): Result {
        if (runAttemptCount >= MAX_ATTEMPTS) {
            Log.w(TAG, "Máximo de reintentos alcanzado ($MAX_ATTEMPTS).")
            return Result.failure()
        }
        Log.d(TAG, "SyncWorker iniciado (intento ${runAttemptCount + 1}/$MAX_ATTEMPTS)")
        return if (ventaRepository.uploadPendientes()) Result.success() else Result.retry()
    }
}
