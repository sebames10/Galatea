/**
 * Lee y valida las variables de entorno al arrancar. Si falta algo
 * obligatorio, la API no levanta y dice qué falta (mejor que fallar en
 * el primer request).
 */
export interface Configuracion {
  puerto: number;
  corsOrigenes: string[];
  db: {
    url: string;
    schema: string;
    zonaHoraria: string;
    ssl: boolean;
  };
  jwt: {
    secreto: string;
    expiraEn: string;
  };
  supabase: {
    url?: string;
    serviceRoleKey?: string;
    bucket: string;
  };
}

export function cargarConfiguracion(env: NodeJS.ProcessEnv = process.env): Configuracion {
  const faltan = ['DATABASE_URL', 'JWT_SECRET'].filter((k) => !env[k]);
  if (faltan.length) {
    throw new Error(`Faltan variables de entorno: ${faltan.join(', ')}. Copiá .env.example como .env y completalas.`);
  }
  const schema = env.DB_SCHEMA ?? 'galatea';
  if (!/^[a-z_][a-z0-9_]*$/.test(schema)) {
    throw new Error('DB_SCHEMA solo puede tener minúsculas, números y guion bajo.');
  }
  if (env.NODE_ENV === 'production' && (env.JWT_SECRET ?? '').length < 32) {
    throw new Error('En producción JWT_SECRET tiene que tener al menos 32 caracteres.');
  }

  return {
    puerto: Number(env.PORT ?? 3000),
    corsOrigenes: (env.CORS_ORIGIN ?? 'http://localhost:5173')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    db: {
      url: env.DATABASE_URL!,
      schema,
      zonaHoraria: env.DB_TIMEZONE ?? 'America/Montevideo',
      ssl: env.DATABASE_SSL === 'true',
    },
    jwt: {
      secreto: env.JWT_SECRET!,
      expiraEn: env.JWT_EXPIRES_IN ?? '12h',
    },
    supabase: {
      url: env.SUPABASE_URL || undefined,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY || undefined,
      bucket: env.SUPABASE_BUCKET ?? 'galatea',
    },
  };
}

export const CONFIG = Symbol('CONFIG');
