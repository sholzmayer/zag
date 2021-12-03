import { createMachine, guards, ref } from "@ui-machines/core"
import { nextTick } from "@ui-machines/dom-utils"
import { dom } from "./tabs.dom"
import { TabsMachineContext, TabsMachineState } from "./tabs.types"

const { not } = guards

export const tabsMachine = createMachine<TabsMachineContext, TabsMachineState>(
  {
    initial: "unknown",
    context: {
      dir: "ltr",
      orientation: "horizontal",
      activationMode: "automatic",
      value: null,
      focusedValue: null,
      uid: "",
      indicatorRect: { left: 0, right: 0, width: 0, height: 0 },
      measuredRect: false,
      loop: true,
    },
    watch: {
      focusedValue: "invokeOnFocus",
      value: "invokeOnChange",
    },
    on: {
      SET_VALUE: {
        actions: ["setValue"],
      },
    },
    states: {
      unknown: {
        on: {
          SETUP: {
            target: "idle",
            actions: ["setupDocument", "checkPanelContent"],
          },
        },
      },
      idle: {
        entry: "setIndicatorRect",
        on: {
          TAB_FOCUS: { target: "focused", actions: "setFocusedValue" },
          TAB_CLICK: {
            target: "focused",
            actions: ["setFocusedValue", "setValue", "setIndicatorRect"],
          },
        },
      },
      focused: {
        on: {
          TAB_CLICK: {
            target: "focused",
            actions: ["setFocusedValue", "setValue", "setIndicatorRect"],
          },
          ARROW_LEFT: {
            guard: "isHorizontal",
            actions: "focusPrevTab",
          },
          ARROW_RIGHT: {
            guard: "isHorizontal",
            actions: "focusNextTab",
          },
          ARROW_UP: {
            guard: "isVertical",
            actions: "focusPrevTab",
          },
          ARROW_DOWN: {
            guard: "isVertical",
            actions: "focusNextTab",
          },
          HOME: { actions: "focusFirstTab" },
          END: { actions: "focusLastTab" },
          ENTER: {
            guard: not("selectOnFocus"),
            actions: ["setValue", "setIndicatorRect"],
          },
          TAB_FOCUS: [
            {
              guard: "selectOnFocus",
              actions: ["setFocusedValue", "setValue", "setIndicatorRect"],
            },
            { actions: "setFocusedValue" },
          ],
          TAB_BLUR: {
            target: "idle",
            actions: "resetFocusedValue",
          },
        },
      },
    },
  },
  {
    guards: {
      isVertical: (ctx) => ctx.orientation === "vertical",
      isHorizontal: (ctx) => ctx.orientation === "horizontal",
      selectOnFocus: (ctx) => ctx.activationMode === "automatic",
    },
    actions: {
      setupDocument(ctx, evt) {
        ctx.uid = evt.id
        ctx.doc = ref(evt.doc)
      },
      setFocusedValue(ctx, evt) {
        ctx.focusedValue = evt.value
      },
      resetFocusedValue(ctx) {
        ctx.focusedValue = null
      },
      setValue(ctx, evt) {
        ctx.value = evt.value
      },
      focusFirstTab(ctx) {
        nextTick(() => dom.getFirstEl(ctx)?.focus())
      },
      focusLastTab(ctx) {
        nextTick(() => dom.getLastEl(ctx)?.focus())
      },
      focusNextTab(ctx) {
        if (!ctx.focusedValue) return
        const next = dom.getNextEl(ctx, ctx.focusedValue)
        nextTick(() => next?.focus())
      },
      focusPrevTab(ctx) {
        if (!ctx.focusedValue) return
        const prev = dom.getPrevEl(ctx, ctx.focusedValue)
        nextTick(() => prev?.focus())
      },
      setIndicatorRect(ctx) {
        nextTick(() => {
          if (!ctx.value) return
          ctx.indicatorRect = dom.getRectById(ctx, ctx.value)
          if (ctx.measuredRect) return
          nextTick(() => {
            ctx.measuredRect = true
          })
        })
      },
      invokeOnChange(ctx) {
        ctx.onChange?.(ctx.value)
      },
      invokeOnFocus(ctx) {
        ctx.onFocus?.(ctx.focusedValue)
      },
    },
  },
)