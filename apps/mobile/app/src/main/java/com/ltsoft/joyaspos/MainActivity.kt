package com.ltsoft.joyaspos

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.ltsoft.joyaspos.presentation.navigation.AppNavHost
import com.ltsoft.joyaspos.ui.theme.JoyasPOSTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            JoyasPOSTheme {
                AppNavHost()
            }
        }
    }
}
