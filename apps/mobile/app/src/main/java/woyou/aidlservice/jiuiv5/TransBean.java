// Ruta: app/src/main/java/woyou/aidlservice/jiuiv5/TransBean.java
package woyou.aidlservice.jiuiv5;

import android.os.Parcel;
import android.os.Parcelable;

/**
 * Esta es la clase de datos Parcelable que falta y que el IWoyouService.aidl necesita.
 * Al compilar, el AIDL encontrará esta clase y el build será exitoso.
 */
public class TransBean implements Parcelable {

    // Estas son las propiedades más comunes de este bean.
    // Lo mantenemos simple porque solo lo necesitamos para compilar.
    private String text;
    private int type;
    private int alignment;
    private int fontSize;

    public TransBean() {
    }

    protected TransBean(Parcel in) {
        text = in.readString();
        type = in.readInt();
        alignment = in.readInt();
        fontSize = in.readInt();
    }

    @Override
    public void writeToParcel(Parcel dest, int flags) {
        dest.writeString(text);
        dest.writeInt(type);
        dest.writeInt(alignment);
        dest.writeInt(fontSize);
    }

    @Override
    public int describeContents() {
        return 0;
    }

    public static final Creator<TransBean> CREATOR = new Creator<TransBean>() {
        @Override
        public TransBean createFromParcel(Parcel in) {
            return new TransBean(in);
        }

        @Override
        public TransBean[] newArray(int size) {
            return new TransBean[size];
        }
    };

    // Getters y Setters
    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public int getType() {
        return type;
    }

    public void setType(int type) {
        this.type = type;
    }

    public int getAlignment() {
        return alignment;
    }

    public void setAlignment(int alignment) {
        this.alignment = alignment;
    }

    public int getFontSize() {
        return fontSize;
    }

    public void setFontSize(int fontSize) {
        this.fontSize = fontSize;
    }
}