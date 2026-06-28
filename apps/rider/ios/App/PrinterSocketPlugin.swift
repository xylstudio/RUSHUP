import Foundation
import Capacitor
import Network

@objc(PrinterSocketPlugin)
public class PrinterSocketPlugin: CAPPlugin {
    
    @objc func send(_ call: CAPPluginCall) {
        guard let ip = call.getString("ipAddress"),
              let port = call.getInt("port"),
              let hexString = call.getString("data") else {
            call.reject("Missing ipAddress, port, or data")
            return
        }
        
        let length = hexString.count / 2
        var data = Data(capacity: length)
        
        var index = hexString.startIndex
        for _ in 0..<length {
            let nextIndex = hexString.index(index, offsetBy: 2)
            let byteString = hexString[index..<nextIndex]
            if let byte = UInt8(byteString, radix: 16) {
                data.append(byte)
            }
            index = nextIndex
        }
        
        let host = NWEndpoint.Host(ip)
        let nwPort = NWEndpoint.Port(integerLiteral: UInt16(port))
        
        let connection = NWConnection(host: host, port: nwPort, using: .tcp)
        
        var hasResolved = false
        
        connection.stateUpdateHandler = { state in
            switch state {
            case .ready:
                connection.send(content: data, completion: .contentProcessed { error in
                    if let error = error {
                        if !hasResolved {
                            hasResolved = true
                            connection.cancel()
                            call.reject("Failed to send data: \(error.localizedDescription)")
                        }
                    } else {
                        if !hasResolved {
                            hasResolved = true
                            connection.cancel()
                            call.resolve()
                        }
                    }
                })
            case .failed(let error):
                if !hasResolved {
                    hasResolved = true
                    connection.cancel()
                    call.reject("Connection failed: \(error.localizedDescription)")
                }
            case .waiting(let error):
                if !hasResolved {
                    hasResolved = true
                    connection.cancel()
                    call.reject("Connection waiting: \(error.localizedDescription)")
                }
            default:
                break
            }
        }
        connection.start(queue: .global())
    }
}
