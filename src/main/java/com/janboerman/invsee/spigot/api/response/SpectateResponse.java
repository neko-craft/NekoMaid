package com.janboerman.invsee.spigot.api.response;

import com.janboerman.invsee.spigot.api.SpectatorInventory;

import java.util.NoSuchElementException;

public interface SpectateResponse<SI extends SpectatorInventory> {
    boolean isSuccess();

    SI getInventory() throws NoSuchElementException;
}
