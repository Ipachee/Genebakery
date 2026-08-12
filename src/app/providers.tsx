import type { ReactNode } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { AuthProvider } from '../auth/AuthContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 'online': si no hay conexión, la query queda "pausada" en vez de
      // fallar con un error de fetch -- se dispara sola apenas vuelve la
      // red. Sin esto, cada corte de wifi de un segundo tiraba errores en
      // toda la app.
      networkMode: 'online',
      retry: 2,
    },
    mutations: {
      networkMode: 'online',
      retry: 2,
    },
  },
});

// Guarda el último estado conocido de mesas/pedidos/productos en
// localStorage para que la app no arranque en blanco si se recarga sin
// conexión -- se ve el plano y el menú con los últimos datos, aunque estén
// un poco viejos hasta que vuelva la red.
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'comandacafe-cache',
});

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 12, // 12hs -- no tiene sentido mostrar datos de hace 3 días
        // Si el DATO que se guarda cambia de forma de manera incompatible
        // (como pasó con el Map de mesas-ocupadas), subir este número
        // invalida de una cualquier cache vieja ya guardada en el
        // localStorage de los navegadores, en vez de depender de que cada
        // uno lo borre a mano.
        buster: 'v2',
        dehydrateOptions: {
          // Solo se persisten queries (lecturas) que ya resolvieron bien.
          // Las mutaciones (agregar item, cobrar, etc.) NO se persisten a
          // propósito: una mutación pendiente no se puede "resumir" después
          // de un recargado de página (la función que la ejecuta vive en
          // memoria, no se puede guardar en localStorage) -- intentarlo
          // igual generaría mutaciones fantasma que fallan silenciosamente.
          // Lo que sí sobrevive a un corte de wifi SIN recargar la página
          // es el pausado/reintento automático de networkMode:'online' de
          // arriba, que no necesita persistencia.
          shouldDehydrateQuery: (query) => query.state.status === 'success',
          shouldDehydrateMutation: () => false,
        },
      }}
    >
      <AuthProvider>{children}</AuthProvider>
    </PersistQueryClientProvider>
  );
}
