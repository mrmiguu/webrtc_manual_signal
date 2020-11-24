import React, { FunctionComponent, ReactNode } from "react"
import { makeStyles } from "@material-ui/core/styles"
import Backdrop from "@material-ui/core/Backdrop"
import VideocamIcon from "@material-ui/icons/Videocam"
import SpeedDial from "@material-ui/lab/SpeedDial"
import SpeedDialAction from "@material-ui/lab/SpeedDialAction"

const useStyles = makeStyles(theme => ({
  root: {
    transform: "translateZ(0px)",
    flexGrow: 1,
  },
  speedDial: {
    position: "absolute",
    bottom: theme.spacing(2),
    right: theme.spacing(2),
  },
}))

const { keys, values, entries } = Object

/**
 * @typedef MenuItem
 * @property {ReactNode} icon
 * @property {(event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void} onClick
 */

/** @typedef {{[key: string]: MenuItem}} Menu */

/**
 * @typedef DialMenuProps
 * @property {Menu} menu
 */

/** @type {FunctionComponent<DialMenuProps>} */
const DialMenu = ({ menu }) => {
  const classes = useStyles()
  const [open, setOpen] = React.useState(false)

  const handleOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <div
      className={classes.root}
      style={{
        position: "fixed",
        height: "100%",
        width: "100%",
      }}
    >
      <Backdrop open={open} />
      <SpeedDial
        ariaLabel="SpeedDial tooltip example"
        className={classes.speedDial}
        icon={<VideocamIcon />}
        onClose={handleClose}
        onOpen={handleOpen}
        open={open}
      >
        {entries(menu).map(([actionName, props]) => (
          <SpeedDialAction
            key={actionName}
            tooltipTitle={actionName}
            tooltipOpen
            {...props}
            onClick={e => {
              props.onClick(e)
              handleClose()
            }}
          />
        ))}
      </SpeedDial>
    </div>
  )
}

export default DialMenu
