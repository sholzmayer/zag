import { createMachine, guards, ref } from "@zag-js/core"
import { dispatchInputCheckedEvent, nextTick, trackFieldsetDisabled, trackFormReset } from "@zag-js/dom-utils"
import { dom } from "./checkbox.dom"
import { MachineContext, MachineState, UserDefinedContext } from "./checkbox.types"

const { and } = guards

export function machine(ctx: UserDefinedContext = {}) {
  return createMachine<MachineContext, MachineState>(
    {
      id: "checkbox",
      initial: "unknown",

      context: {
        uid: "",
        active: false,
        hovered: false,
        focused: false,
        disabled: false,
        readonly: false,
        ...ctx,
      },

      watch: {
        indeterminate: ["syncInputIndeterminate"],
        disabled: ["removeFocusIfNeeded"],
      },

      computed: {
        isInteractive: (ctx) => !(ctx.readonly || ctx.disabled),
        isRtl: (ctx) => ctx.dir === "rtl",
      },

      activities: ["trackFormReset", "trackFieldsetDisabled"],

      on: {
        SET_STATE: [
          {
            guard: and("shouldCheck", "canToggle"),
            target: "checked",
            actions: ["dispatchChangeEvent"],
          },
          {
            guard: "canToggle",
            target: "unchecked",
            actions: ["dispatchChangeEvent"],
          },
        ],

        SET_ACTIVE: {
          actions: "setActive",
        },
        SET_HOVERED: {
          actions: "setHovered",
        },
        SET_FOCUSED: {
          actions: "setFocused",
        },
        SET_INDETERMINATE: {
          actions: "setIndeterminate",
        },
      },

      states: {
        unknown: {
          on: {
            SETUP: {
              target: ctx.defaultChecked ? "checked" : "unchecked",
              actions: ["setupDocument"],
            },
          },
        },
        checked: {
          on: {
            TOGGLE: {
              target: "unchecked",
              guard: "canToggle",
              actions: ["invokeOnChange"],
            },
          },
        },
        unchecked: {
          on: {
            TOGGLE: {
              target: "checked",
              guard: "canToggle",
              actions: ["invokeOnChange"],
            },
          },
        },
      },
    },
    {
      guards: {
        shouldCheck: (_, evt) => evt.checked,
        canToggle: (ctx) => !ctx.readonly,
      },

      activities: {
        trackFieldsetDisabled(ctx) {
          let cleanup: VoidFunction | undefined
          nextTick(() => {
            cleanup = trackFieldsetDisabled(dom.getRootEl(ctx), (disabled) => {
              if (disabled) {
                ctx.disabled = disabled
              }
            })
          })
          return () => cleanup?.()
        },
        trackFormReset(ctx, _evt, { send }) {
          let cleanup: VoidFunction | undefined
          nextTick(() => {
            cleanup = trackFormReset(dom.getInputEl(ctx), () => {
              if (ctx.defaultChecked != null) {
                send({ type: "SET_STATE", checked: ctx.defaultChecked })
              }
            })
          })
          return () => cleanup?.()
        },
      },

      actions: {
        setupDocument(ctx, evt) {
          ctx.uid = evt.id
          if (evt.doc) ctx.doc = ref(evt.doc)
          if (evt.root) ctx.rootNode = ref(evt.root)
        },
        invokeOnChange(ctx, _evt, { state }) {
          const checked = state.matches("checked")
          ctx.onChange?.({ checked: ctx.indeterminate ? "indeterminate" : checked })
        },
        setActive(ctx, evt) {
          ctx.active = evt.active
        },
        setDisabled(ctx, evt) {
          ctx.disabled = evt.disabled
        },
        setHovered(ctx, evt) {
          ctx.hovered = evt.hovered
        },
        setFocused(ctx, evt) {
          ctx.focused = evt.focused
        },
        setIndeterminate(ctx, evt) {
          ctx.indeterminate = evt.indeterminate
        },
        setReadOnly(ctx, evt) {
          ctx.readonly = evt.readonly
        },
        syncInputIndeterminate(ctx) {
          const inputEl = dom.getInputEl(ctx)
          if (!inputEl) return
          inputEl.indeterminate = Boolean(ctx.indeterminate)
        },
        dispatchChangeEvent(ctx, evt) {
          if (!evt.manual) return
          const inputEl = dom.getInputEl(ctx)
          if (!inputEl) return
          dispatchInputCheckedEvent(inputEl, evt.checked)
        },
        removeFocusIfNeeded(ctx) {
          if (ctx.disabled && ctx.focused) {
            ctx.focused = false
          }
        },
      },
    },
  )
}