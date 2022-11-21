package com.janboerman.invsee.spigot.api;

import com.janboerman.invsee.spigot.api.response.SpectateResponse;

import java.util.concurrent.CompletableFuture;

public abstract class InvseeAPI {
    public CompletableFuture<SpectateResponse<MainSpectatorInventory>> mainSpectatorInventory(String targetName, String title) {
        return null;
    }

    public CompletableFuture<SpectateResponse<EnderSpectatorInventory>> enderSpectatorInventory(String targetName, String title) {
        return null;
    }

    public abstract CompletableFuture<Void> saveInventory(MainSpectatorInventory var1);
    public abstract CompletableFuture<Void> saveEnderChest(EnderSpectatorInventory var1);
}
