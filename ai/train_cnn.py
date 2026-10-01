"""Treinamento opcional de CNN para o dataset do GestureCar.
Execute depois de coletar imagens nas pastas dataset/<classe>.
"""
import os
import tensorflow as tf

DATASET="dataset"
IMG=(128,128)
BATCH=32

def main():
    train=tf.keras.utils.image_dataset_from_directory(DATASET, validation_split=0.2, subset="training", seed=42, image_size=IMG, batch_size=BATCH)
    val=tf.keras.utils.image_dataset_from_directory(DATASET, validation_split=0.2, subset="validation", seed=42, image_size=IMG, batch_size=BATCH)
    classes=train.class_names
    model=tf.keras.Sequential([
        tf.keras.layers.Rescaling(1./255),
        tf.keras.layers.Conv2D(32,3,activation="relu"), tf.keras.layers.MaxPooling2D(),
        tf.keras.layers.Conv2D(64,3,activation="relu"), tf.keras.layers.MaxPooling2D(),
        tf.keras.layers.Conv2D(128,3,activation="relu"), tf.keras.layers.MaxPooling2D(),
        tf.keras.layers.Flatten(), tf.keras.layers.Dropout(0.35),
        tf.keras.layers.Dense(128,activation="relu"), tf.keras.layers.Dense(len(classes),activation="softmax")
    ])
    model.compile(optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    model.fit(train, validation_data=val, epochs=15, callbacks=[tf.keras.callbacks.EarlyStopping(patience=3, restore_best_weights=True)])
    os.makedirs("models",exist_ok=True)
    model.save("models/gesture_cnn.keras")
    with open("models/classes.txt","w",encoding="utf-8") as f: f.write("\n".join(classes))
    print("Modelo salvo em models/gesture_cnn.keras")
if __name__=="__main__": main()
