// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CustomPrinterPlugin",
    platforms: [.iOS(.v13)],
    products: [
        .library(
            name: "CustomPrinterPlugin",
            targets: ["CustomPrinterPlugin", "CustomPrinterPluginObjc"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.3.4")
    ],
    targets: [
        .target(
            name: "CustomPrinterPluginObjc",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/CustomPrinterPluginObjc",
            publicHeadersPath: "."
        ),
        .target(
            name: "CustomPrinterPlugin",
            dependencies: [
                "CustomPrinterPluginObjc",
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/CustomPrinterPlugin"
        )
    ]
)
