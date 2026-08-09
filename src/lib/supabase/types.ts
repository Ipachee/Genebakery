export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      clientes: {
        Row: {
          apellido: string
          condicion_fiscal: string | null
          cuit: string | null
          deleted_at: string | null
          descuento_pct: number
          direccion: string | null
          dni: string | null
          email: string | null
          id: number
          nombre: string
          total_gastado: number
          visitas: number
        }
        Insert: {
          apellido: string
          condicion_fiscal?: string | null
          cuit?: string | null
          deleted_at?: string | null
          descuento_pct?: number
          direccion?: string | null
          dni?: string | null
          email?: string | null
          id?: never
          nombre: string
          total_gastado?: number
          visitas?: number
        }
        Update: {
          apellido?: string
          condicion_fiscal?: string | null
          cuit?: string | null
          deleted_at?: string | null
          descuento_pct?: number
          direccion?: string | null
          dni?: string | null
          email?: string | null
          id?: never
          nombre?: string
          total_gastado?: number
          visitas?: number
        }
        Relationships: []
      }
      elaborados: {
        Row: {
          costo_unit_porcion: number
          deleted_at: string | null
          id: number
          nombre: string
          porciones_min: number
          porciones_por_unidad: number
          producto_id: number
          stock_porciones: number
        }
        Insert: {
          costo_unit_porcion?: number
          deleted_at?: string | null
          id?: never
          nombre: string
          porciones_min?: number
          porciones_por_unidad: number
          producto_id: number
          stock_porciones?: number
        }
        Update: {
          costo_unit_porcion?: number
          deleted_at?: string | null
          id?: never
          nombre?: string
          porciones_min?: number
          porciones_por_unidad?: number
          producto_id?: number
          stock_porciones?: number
        }
        Relationships: [
          {
            foreignKeyName: "elaborados_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      empleados: {
        Row: {
          apellido: string
          cuit: string | null
          deleted_at: string | null
          descuento_pct: number
          direccion: string | null
          dni: string | null
          id: number
          ingreso: string | null
          nombre: string
          profile_id: string | null
          puesto: string | null
        }
        Insert: {
          apellido: string
          cuit?: string | null
          deleted_at?: string | null
          descuento_pct?: number
          direccion?: string | null
          dni?: string | null
          id?: never
          ingreso?: string | null
          nombre: string
          profile_id?: string | null
          puesto?: string | null
        }
        Update: {
          apellido?: string
          cuit?: string | null
          deleted_at?: string | null
          descuento_pct?: number
          direccion?: string | null
          dni?: string | null
          id?: never
          ingreso?: string | null
          nombre?: string
          profile_id?: string | null
          puesto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empleados_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gastos: {
        Row: {
          cantidad: number
          costo_total: number
          deleted_at: string | null
          fecha: string
          id: number
          insumo_id: number
          proveedor: string | null
          usuario_id: string
        }
        Insert: {
          cantidad: number
          costo_total: number
          deleted_at?: string | null
          fecha?: string
          id?: never
          insumo_id: number
          proveedor?: string | null
          usuario_id: string
        }
        Update: {
          cantidad?: number
          costo_total?: number
          deleted_at?: string | null
          fecha?: string
          id?: never
          insumo_id?: number
          proveedor?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gastos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      insumos: {
        Row: {
          costo_unit: number
          deleted_at: string | null
          id: number
          nombre: string
          stock: number
          stock_inicial: number
          stock_min: number
          unidad: string
        }
        Insert: {
          costo_unit?: number
          deleted_at?: string | null
          id?: never
          nombre: string
          stock?: number
          stock_inicial?: number
          stock_min?: number
          unidad: string
        }
        Update: {
          costo_unit?: number
          deleted_at?: string | null
          id?: never
          nombre?: string
          stock?: number
          stock_inicial?: number
          stock_min?: number
          unidad?: string
        }
        Relationships: []
      }
      mesas: {
        Row: {
          deleted_at: string | null
          h: number
          id: number
          label: string | null
          mesa_padre_id: number | null
          salon_id: number
          shape: string
          w: number
          x: number
          y: number
        }
        Insert: {
          deleted_at?: string | null
          h: number
          id?: never
          label?: string | null
          mesa_padre_id?: number | null
          salon_id: number
          shape?: string
          w: number
          x: number
          y: number
        }
        Update: {
          deleted_at?: string | null
          h?: number
          id?: never
          label?: string | null
          mesa_padre_id?: number | null
          salon_id?: number
          shape?: string
          w?: number
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "mesas_mesa_padre_id_fkey"
            columns: ["mesa_padre_id"]
            isOneToOne: false
            referencedRelation: "mesas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mesas_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salones"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos: {
        Row: {
          cantidad: number
          elaborado_id: number | null
          fecha: string
          id: number
          insumo_id: number | null
          ref: string | null
          stock_resultante: number
          tipo: string
        }
        Insert: {
          cantidad: number
          elaborado_id?: number | null
          fecha?: string
          id?: never
          insumo_id?: number | null
          ref?: string | null
          stock_resultante: number
          tipo: string
        }
        Update: {
          cantidad?: number
          elaborado_id?: number | null
          fecha?: string
          id?: never
          insumo_id?: number | null
          ref?: string | null
          stock_resultante?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_elaborado_id_fkey"
            columns: ["elaborado_id"]
            isOneToOne: false
            referencedRelation: "elaborados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_items: {
        Row: {
          cantidad: number
          created_at: string
          enviado_cocina: boolean
          id: number
          nota: string | null
          pedido_id: number
          precio_unitario: number
          producto_id: number
        }
        Insert: {
          cantidad?: number
          created_at?: string
          enviado_cocina?: boolean
          id?: never
          nota?: string | null
          pedido_id: number
          precio_unitario: number
          producto_id: number
        }
        Update: {
          cantidad?: number
          created_at?: string
          enviado_cocina?: boolean
          id?: never
          nota?: string | null
          pedido_id?: number
          precio_unitario?: number
          producto_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_items_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          cliente_id: number | null
          cobrado_at: string | null
          created_at: string
          deleted_at: string | null
          descuento: number
          estado: string
          id: number
          mesa_id: number | null
          metodo_pago: string | null
          mozo_id: string
          subtotal: number
          total: number
          turno_id: number
        }
        Insert: {
          cliente_id?: number | null
          cobrado_at?: string | null
          created_at?: string
          deleted_at?: string | null
          descuento?: number
          estado?: string
          id?: never
          mesa_id?: number | null
          metodo_pago?: string | null
          mozo_id: string
          subtotal?: number
          total?: number
          turno_id: number
        }
        Update: {
          cliente_id?: number | null
          cobrado_at?: string | null
          created_at?: string
          deleted_at?: string | null
          descuento?: number
          estado?: string
          id?: never
          mesa_id?: number | null
          metodo_pago?: string | null
          mozo_id?: string
          subtotal?: number
          total?: number
          turno_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_mesa_id_fkey"
            columns: ["mesa_id"]
            isOneToOne: false
            referencedRelation: "mesas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_mozo_id_fkey"
            columns: ["mozo_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_turno_id_fkey"
            columns: ["turno_id"]
            isOneToOne: false
            referencedRelation: "turnos"
            referencedColumns: ["id"]
          },
        ]
      }
      producciones: {
        Row: {
          cantidad_unidades: number
          costo_total: number
          deleted_at: string | null
          elaborado_id: number
          fecha: string
          id: number
          usuario_id: string
        }
        Insert: {
          cantidad_unidades: number
          costo_total: number
          deleted_at?: string | null
          elaborado_id: number
          fecha?: string
          id?: never
          usuario_id: string
        }
        Update: {
          cantidad_unidades?: number
          costo_total?: number
          deleted_at?: string | null
          elaborado_id?: number
          fecha?: string
          id?: never
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "producciones_elaborado_id_fkey"
            columns: ["elaborado_id"]
            isOneToOne: false
            referencedRelation: "elaborados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producciones_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          activo: boolean
          categoria: string
          deleted_at: string | null
          id: number
          nombre: string
          precio: number
        }
        Insert: {
          activo?: boolean
          categoria: string
          deleted_at?: string | null
          id?: never
          nombre: string
          precio: number
        }
        Update: {
          activo?: boolean
          categoria?: string
          deleted_at?: string | null
          id?: never
          nombre?: string
          precio?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activo: boolean
          apellido: string
          created_at: string
          id: string
          nombre: string
          rol: string
        }
        Insert: {
          activo?: boolean
          apellido: string
          created_at?: string
          id: string
          nombre: string
          rol: string
        }
        Update: {
          activo?: boolean
          apellido?: string
          created_at?: string
          id?: string
          nombre?: string
          rol?: string
        }
        Relationships: []
      }
      recetas: {
        Row: {
          cantidad: number
          id: number
          insumo_id: number
          producto_id: number
        }
        Insert: {
          cantidad: number
          id?: never
          insumo_id: number
          producto_id: number
        }
        Update: {
          cantidad?: number
          id?: never
          insumo_id?: number
          producto_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "recetas_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recetas_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      salones: {
        Row: {
          deleted_at: string | null
          h: number
          id: number
          nombre: string
          orden: number
          tag: string | null
          w: number
          x: number
          y: number
        }
        Insert: {
          deleted_at?: string | null
          h: number
          id?: never
          nombre: string
          orden?: number
          tag?: string | null
          w: number
          x: number
          y: number
        }
        Update: {
          deleted_at?: string | null
          h?: number
          id?: never
          nombre?: string
          orden?: number
          tag?: string | null
          w?: number
          x?: number
          y?: number
        }
        Relationships: []
      }
      turnos: {
        Row: {
          abierto_at: string
          abierto_por: string
          cerrado_at: string | null
          estado: string
          etiqueta: string
          id: number
        }
        Insert: {
          abierto_at?: string
          abierto_por: string
          cerrado_at?: string | null
          estado?: string
          etiqueta?: string
          id?: never
        }
        Update: {
          abierto_at?: string
          abierto_por?: string
          cerrado_at?: string | null
          estado?: string
          etiqueta?: string
          id?: never
        }
        Relationships: [
          {
            foreignKeyName: "turnos_abierto_por_fkey"
            columns: ["abierto_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ventas: {
        Row: {
          cliente_id: number | null
          created_at: string
          deleted_at: string | null
          descuento: number
          id: number
          mesa_id: number | null
          metodo_pago: string
          mozo_id: string
          pedido_id: number
          subtotal: number
          total: number
          turno_id: number
        }
        Insert: {
          cliente_id?: number | null
          created_at?: string
          deleted_at?: string | null
          descuento?: number
          id?: never
          mesa_id?: number | null
          metodo_pago: string
          mozo_id: string
          pedido_id: number
          subtotal: number
          total: number
          turno_id: number
        }
        Update: {
          cliente_id?: number | null
          created_at?: string
          deleted_at?: string | null
          descuento?: number
          id?: never
          mesa_id?: number | null
          metodo_pago?: string
          mozo_id?: string
          pedido_id?: number
          subtotal?: number
          total?: number
          turno_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "ventas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_mesa_id_fkey"
            columns: ["mesa_id"]
            isOneToOne: false
            referencedRelation: "mesas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_mozo_id_fkey"
            columns: ["mozo_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_turno_id_fkey"
            columns: ["turno_id"]
            isOneToOne: false
            referencedRelation: "turnos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      papelera: {
        Row: {
          deleted_at: string | null
          id: number | null
          resumen: string | null
          tipo: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
