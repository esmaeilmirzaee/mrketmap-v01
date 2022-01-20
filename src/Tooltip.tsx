import React from 'react';
import ReactDOM from 'react-dom'

export function Tooltip  ({text,children, ...props}) {
    return <>
    {children}
        <Portal>
            <span>{text}</span>
        </Portal>
    </>
}

function Portal( props: any) {
return ReactDOM.createPortal(props.children, document.body)
}